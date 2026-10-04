import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(experimentRoot, "results", "perf041-baseline.json");
const afterPath = path.join(experimentRoot, "results", "perf041-native-gated.json");
const gatePath = path.join(experimentRoot, "results", "perf041-native-gate.json");
const outputPath = path.join(experimentRoot, "results", "perf041-analysis.json");

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));
const sha256 = (filePath) => createHash("sha256").update(readFileSync(filePath)).digest("hex");

function round(value, places = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function median(values) {
  const ordered = values.filter(Number.isFinite).toSorted((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function distribution(values) {
  return {
    median: round(median(values)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
}

const baseline = readJson(baselinePath);
const after = readJson(afterPath);
const gate = readJson(gatePath);

assert.equal(baseline.experiment, "PERF-041");
assert.equal(after.experiment, "PERF-041");
assert.equal(baseline.phase, "baseline");
assert.equal(after.phase, "native-gated");
assert.equal(baseline.runs.length, 20);
assert.equal(after.runs.length, 20);
assert.deepEqual(after.transport, baseline.transport);
assert.equal(gate.claims.promotedImageUnrequestedWhileFar, true);
assert.equal(gate.claims.promotedImageStartsHighOnlyAfterApproach, true);
assert.equal(gate.claims.laterLazyImageRemainsUnrequested, true);

const comparisons = baseline.runs.map((before, index) => {
  const promoted = after.runs[index];
  assert.equal(promoted.route, before.route);
  assert.equal(promoted.profile, before.profile);
  assert.equal(promoted.repetition, before.repetition);
  assert.deepEqual(promoted.viewport, before.viewport);
  assert.ok(Math.abs(promoted.image.top - before.image.top) <= 0.5);
  assert.ok(Math.abs(promoted.image.width - before.image.width) <= 0.5);
  assert.ok(Math.abs(promoted.image.height - before.image.height) <= 0.5);
  assert.equal(before.image.loading, "lazy");
  assert.equal(promoted.image.loading, "lazy");
  assert.equal(before.image.fetchPriority, "auto");
  assert.equal(promoted.image.fetchPriority, "high");
  assert.equal(before.image.initialPriority, "Low");
  assert.equal(promoted.image.initialPriority, "High");
  assert.equal(before.image.requestObserved, true);
  assert.equal(promoted.image.requestObserved, true);
  assert.equal(before.preloads, 0);
  assert.equal(promoted.preloads, 0);
  assert.equal(promoted.lcp.alt, before.lcp.alt);
  assert.equal(promoted.lcp.tagName, before.lcp.tagName);

  return {
    route: before.route,
    profile: before.profile,
    repetition: before.repetition,
    geometry: {
      top: promoted.image.top,
      distanceBelowViewport: promoted.image.distanceBelowViewport,
      intersectsViewport: promoted.image.intersectsViewport,
    },
    initialPriority: {
      before: before.image.initialPriority,
      after: promoted.image.initialPriority,
    },
    resourceStart: { before: before.image.resourceStart, after: promoted.image.resourceStart },
    responseEnd: { before: before.image.responseEnd, after: promoted.image.responseEnd },
    lcp: {
      identity: promoted.lcp.alt || promoted.lcp.tagName,
      before: before.lcp.startTime,
      after: promoted.lcp.startTime,
    },
  };
});

const groups = [];
for (const profile of ["mobile", "desktop"]) {
  for (const route of ["control-plane", "load-balancer"]) {
    const rows = comparisons.filter((row) => row.profile === profile && row.route === route);
    const responseBefore = rows.map((row) => row.responseEnd.before);
    const responseAfter = rows.map((row) => row.responseEnd.after);
    const lcpBefore = rows.map((row) => row.lcp.before);
    const lcpAfter = rows.map((row) => row.lcp.after);
    groups.push({
      profile,
      route,
      repetitions: rows.length,
      geometry: rows[0].geometry,
      lcpIdentity: rows[0].lcp.identity,
      imageResponseEndMs: {
        before: distribution(responseBefore),
        after: distribution(responseAfter),
        medianImprovement: round(median(responseBefore) - median(responseAfter)),
      },
      lcpMs: {
        before: distribution(lcpBefore),
        after: distribution(lcpAfter),
        medianImprovement: round(median(lcpBefore) - median(lcpAfter)),
      },
    });
  }
}

const desktop = groups.filter((group) => group.profile === "desktop");
const mobile = groups.filter((group) => group.profile === "mobile");
assert.ok(desktop.every((group) => group.lcpIdentity !== "IMG" && group.lcpIdentity.length > 0));
assert.ok(desktop.every((group) => group.lcpMs.medianImprovement > 500));
assert.ok(mobile.every((group) => !group.lcpIdentity.includes("Architecture")));

const inputs = [baselinePath, afterPath, gatePath].map((filePath) => ({
  path: path.relative(path.resolve(experimentRoot, "../.."), filePath),
  bytes: readFileSync(filePath).length,
  sha256: sha256(filePath),
}));

const output = {
  experiment: "PERF-041",
  generatedAt: new Date().toISOString(),
  decision: "adopt-native-lazy-first-image-priority",
  inputs,
  method: baseline.method,
  claims: {
    geometryPreserved: true,
    allMeasuredImagesRemainLazy: true,
    firstContentImagePriority: "Low -> High in 20/20 controlled runs",
    preloadCountPreservedAtZero: true,
    lcpIdentityPreserved: true,
    desktopImageLcpImprovedOver500msInBothRoutes: true,
    farHighPriorityImageStayedUnrequestedUntilApproach: true,
    laterLazyImageStayedUnrequested: true,
  },
  groups,
  comparisons,
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ decision: output.decision, claims: output.claims, groups }, null, 2));
console.log(`Wrote ${outputPath}`);
