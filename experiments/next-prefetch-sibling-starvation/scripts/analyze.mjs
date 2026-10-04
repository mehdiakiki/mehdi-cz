import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(3));
}

export function isStarvedRun(run) {
  return (
    run.scenario === "imperative" &&
    run.missingPrefetchPaths.length > 0 &&
    run.retry?.requests.total === 0 &&
    run.navigation?.requests.total > 0
  );
}

export function isFullPrefetchStarvedRun(run) {
  return (
    run.scenario === "imperative-full" &&
    run.missingPrefetchPaths.length > 0 &&
    run.retry?.requests.total === 0 &&
    run.navigation?.requests.total > 0
  );
}

function pattern(value) {
  return JSON.stringify(value);
}

function frequency(values) {
  const counts = new Map();
  for (const value of values) counts.set(pattern(value), (counts.get(pattern(value)) || 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value: JSON.parse(value), count }))
    .sort(
      (left, right) =>
        right.count - left.count || pattern(left.value).localeCompare(pattern(right.value))
    );
}

export function summarizeGroup(runs) {
  return {
    repetitions: runs.length,
    prefetchPatterns: frequency(
      runs.map((run) => ({
        total: run.prefetch.total,
        routeTree: run.prefetch.routeTree,
        segment: run.prefetch.segment,
        routePayload: run.prefetch.routePayload,
        fullPrefetch: run.prefetch.fullPrefetch || 0,
      }))
    ),
    missingPrefetchPathRuns: runs.filter((run) => run.missingPrefetchPaths.length > 0).length,
    missingTreePathRuns: runs.filter((run) => run.missingTreePaths.length > 0).length,
    retryNoOpRuns: runs.filter((run) => run.retry?.requests.total === 0).length,
    clickNetworkRuns: runs.filter((run) => run.navigation?.requests.total > 0).length,
    starvedRuns: runs.filter(isStarvedRun).length,
    medianClickToContentMs: median(
      runs.map((run) => run.navigation?.clickToContentMs).filter(Number.isFinite)
    ),
    pageErrorRuns: runs.filter((run) => run.pageErrors.length > 0).length,
  };
}

export function compareControlledClicks(groups, stableLabel, patchedLabel, scenario) {
  const stableRows = groups.filter(
    (row) => row.label === stableLabel && row.profile === "controlled" && row.scenario === scenario
  );
  const patchedRows = groups.filter(
    (row) => row.label === patchedLabel && row.profile === "controlled" && row.scenario === scenario
  );

  return stableRows
    .map((stable) => {
      const patched = patchedRows.find((row) => row.count === stable.count);
      if (!patched) return null;
      return {
        count: stable.count,
        stableMedianMs: stable.medianClickToContentMs,
        patchedMedianMs: patched.medianClickToContentMs,
        deltaMs:
          stable.medianClickToContentMs === null || patched.medianClickToContentMs === null
            ? null
            : Number((patched.medianClickToContentMs - stable.medianClickToContentMs).toFixed(3)),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.count - right.count);
}

export function analyzeDatasets(datasets) {
  const groups = [];
  for (const dataset of datasets) {
    const groupedRuns = new Map();
    for (const run of dataset.runs) {
      const key = `${run.routeKind}/${run.scenario}/${run.count}`;
      const values = groupedRuns.get(key) || [];
      values.push(run);
      groupedRuns.set(key, values);
    }
    for (const [key, runs] of groupedRuns) {
      groups.push({
        label: dataset.label,
        nextVersion: dataset.nextVersion,
        cacheMode: dataset.cacheMode,
        bundler: dataset.bundler,
        profile: dataset.profile || "local",
        key,
        routeKind: runs[0].routeKind,
        scenario: runs[0].scenario,
        count: runs[0].count,
        ...summarizeGroup(runs),
      });
    }
  }

  const legacyRows = groups.filter(
    (row) =>
      row.cacheMode === "legacy" && row.routeKind === "static" && row.scenario === "viewport-auto"
  );
  const starvationRows = groups.filter(
    (row) =>
      row.cacheMode === "partial" && row.routeKind === "partial" && row.scenario === "imperative"
  );
  const fullPrefetchRows = groups.filter(
    (row) =>
      row.cacheMode === "partial" &&
      row.routeKind === "partial" &&
      row.scenario === "imperative-full"
  );
  const disabledRows = groups.filter((row) => row.scenario === "disabled");
  const affectedRows = starvationRows.filter((row) => row.starvedRuns > 0);
  const patchedBoundaryRows = starvationRows.filter(
    (row) => row.label.includes("patched") && row.count >= 5
  );
  const affectedLabels = [...new Set(affectedRows.map((row) => row.label))].sort();
  const defaultAppShellClickComparison = compareControlledClicks(
    groups,
    "stable-auto-webpack-controlled",
    "patched-pr97377-auto-webpack-controlled",
    "imperative"
  );
  const urlSpecificFullClickComparison = compareControlledClicks(
    groups,
    "stable-full-webpack-controlled",
    "patched-pr97377-full-webpack-controlled",
    "imperative-full"
  );
  const controlledComparisons = [
    ...defaultAppShellClickComparison,
    ...urlSpecificFullClickComparison,
  ];

  return {
    experiment: "PERF-046 Next.js sibling prefetch protocol and starvation analysis",
    generatedAt: new Date().toISOString(),
    inputs: datasets.map(({ label, nextVersion, cacheMode, bundler, profile, generatedAt }) => ({
      label,
      nextVersion,
      cacheMode,
      bundler,
      profile: profile || "local",
      generatedAt,
    })),
    findings: {
      protocolAttributionConfirmed:
        legacyRows.length > 0 &&
        legacyRows.every((row) =>
          row.prefetchPatterns.every(
            ({ value }) =>
              value.routeTree === Math.min(row.count, 4) &&
              value.segment === row.count &&
              value.routePayload === 0 &&
              value.fullPrefetch === 0
          )
        ),
      disabledPrefetchGuardPassed:
        disabledRows.length > 0 &&
        disabledRows.every((row) => row.prefetchPatterns.every(({ value }) => value.total === 0)),
      starvationObserved: affectedRows.length > 0,
      affectedLabels,
      affectsWebpackAndTurbopack:
        affectedRows.some((row) => row.bundler === "webpack") &&
        affectedRows.some((row) => row.bundler === "turbopack"),
      currentCanaryAffected: affectedRows.some((row) => row.label.includes("canary")),
      urlSpecificFullPrefetchStarvationObserved: datasets
        .flatMap((dataset) => dataset.runs)
        .some(isFullPrefetchStarvedRun),
      fullPrefetchMissingTreeRows: fullPrefetchRows
        .filter((row) => row.missingTreePathRuns > 0)
        .map((row) => ({
          label: row.label,
          bundler: row.bundler,
          count: row.count,
          missingTreePathRuns: row.missingTreePathRuns,
          missingPrefetchPathRuns: row.missingPrefetchPathRuns,
        })),
      starvationBoundary: affectedRows
        .map((row) => ({ label: row.label, bundler: row.bundler, count: row.count }))
        .sort((left, right) => left.count - right.count),
      patchValidationPassed:
        patchedBoundaryRows.length > 0 &&
        patchedBoundaryRows.every(
          (row) =>
            row.starvedRuns === 0 &&
            row.missingPrefetchPathRuns === 0 &&
            row.missingTreePathRuns === 0
        ),
      patchedLabelsWithoutStarvation: [
        ...new Set(
          patchedBoundaryRows
            .filter(
              (row) =>
                row.starvedRuns === 0 &&
                row.missingPrefetchPathRuns === 0 &&
                row.missingTreePathRuns === 0
            )
            .map((row) => row.label)
        ),
      ].sort(),
      controlledClickSpeedupConfirmed:
        controlledComparisons.length > 0 &&
        controlledComparisons.every(({ deltaMs }) => deltaMs !== null && deltaMs < 0),
      controlledClickComparisons: {
        defaultAppShell: defaultAppShellClickComparison,
        urlSpecificFull: urlSpecificFullClickComparison,
      },
    },
    groups,
  };
}

function main() {
  const requestedFilenames = process.argv.slice(2);
  const filenames = requestedFilenames.length
    ? requestedFilenames
    : readdirSync(path.join(experimentRoot, "results"))
        .filter((filename) => filename.endsWith(".json") && filename !== "perf046-analysis.json")
        .map((filename) => path.join(experimentRoot, "results", filename));
  if (!filenames.length) {
    throw new Error("Pass one or more PERF-046 measurement JSON files.");
  }
  const datasets = filenames
    .map((filename) => JSON.parse(readFileSync(path.resolve(filename), "utf8")))
    .filter((dataset) => Array.isArray(dataset.runs));
  if (!datasets.length) throw new Error("No PERF-046 measurement datasets were found.");
  const analysis = analyzeDatasets(datasets);
  const outputPath = path.join(experimentRoot, "results", "perf046-analysis.json");
  writeFileSync(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
  console.table(
    analysis.groups.map((row) => ({
      label: row.label,
      scenario: row.key,
      prefetch: pattern(row.prefetchPatterns.map(({ value, count }) => ({ ...value, n: count }))),
      missing: row.missingPrefetchPathRuns,
      retryNoOp: row.retryNoOpRuns,
      clickNetwork: row.clickNetworkRuns,
      starved: row.starvedRuns,
      clickMs: row.medianClickToContentMs,
      errors: row.pageErrorRuns,
    }))
  );
  console.log(JSON.stringify(analysis.findings, null, 2));
  console.log(`Wrote ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
