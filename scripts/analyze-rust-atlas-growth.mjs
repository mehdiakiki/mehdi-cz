import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { rustAtlasGrowthExperiments } from "../data/rust-atlas-growth-experiments.mjs";
import { rustFailureAtlasEntries } from "../data/rust-failure-atlas.mjs";

const millisecondsPerDay = 86_400_000;
const brandFragments = ["mehdi", "akiki", "mehdi.cz"];

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index === -1 ? undefined : argumentsList[index + 1];
}

function requireIsoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new Error(`${name} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${name} is not a valid date`);
  return date;
}

function inclusiveDays(startDate, endDate) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function round(value, places = 2) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function pathFromSearchConsoleKey(value) {
  try {
    const url = new URL(value, "https://www.mehdi.cz");
    return url.pathname.replace(/\/$/, "") || "/";
  } catch {
    return (
      String(value)
        .replace(/[?#].*$/, "")
        .replace(/\/$/, "") || "/"
    );
  }
}

function isBrandedQuery(query) {
  const normalized = query.toLocaleLowerCase("en");
  return brandFragments.some((fragment) => normalized.includes(fragment));
}

function casePathsById() {
  return new Map(
    rustFailureAtlasEntries.flatMap((entry) =>
      entry.caseSlug ? [[entry.id, `/rust/failures/${entry.caseSlug}`]] : []
    )
  );
}

function rowsByPage(searchAnalytics, dimensions) {
  if (!Array.isArray(searchAnalytics?.rows)) {
    throw new Error("Search Console JSON must contain a rows array");
  }
  const pageIndex = dimensions.indexOf("page");
  const queryIndex = dimensions.indexOf("query");
  if (pageIndex < 0 || queryIndex < 0) {
    throw new Error("The experiment requires Search Console rows grouped by page and query");
  }

  const pages = new Map();
  for (const row of searchAnalytics.rows) {
    if (!Array.isArray(row.keys) || row.keys.length < dimensions.length) {
      throw new Error("Every Search Console row needs keys matching the declared dimensions");
    }
    const query = String(row.keys[queryIndex] || "").trim();
    if (!query || isBrandedQuery(query)) continue;

    const page = pathFromSearchConsoleKey(String(row.keys[pageIndex] || ""));
    const impressions = Number(row.impressions || 0);
    const clicks = Number(row.clicks || 0);
    const position = Number(row.position || 0);
    const aggregate = pages.get(page) || {
      clicks: 0,
      impressions: 0,
      positionWeight: 0,
      queries: new Set(),
      longTailQueries: new Set(),
    };

    aggregate.clicks += clicks;
    aggregate.impressions += impressions;
    aggregate.positionWeight += position * impressions;
    aggregate.queries.add(query);
    if (query.split(/\s+/).filter(Boolean).length >= 4) aggregate.longTailQueries.add(query);
    pages.set(page, aggregate);
  }
  return pages;
}

function cohortSummary(cohort, pages, paths) {
  const perPage = cohort.caseIds.map((caseId) => {
    const path = paths.get(caseId);
    if (!path) throw new Error(`${caseId} has no dedicated Atlas page`);
    const aggregate = pages.get(path);
    return {
      caseId,
      path,
      clicks: aggregate?.clicks || 0,
      impressions: aggregate?.impressions || 0,
      queries: aggregate?.queries.size || 0,
      longTailQueries: aggregate?.longTailQueries.size || 0,
      averagePosition:
        aggregate?.impressions > 0 ? round(aggregate.positionWeight / aggregate.impressions) : null,
    };
  });

  const clicks = perPage.reduce((total, page) => total + page.clicks, 0);
  const impressions = perPage.reduce((total, page) => total + page.impressions, 0);
  const weightedPositionTotal = perPage.reduce(
    (total, page) =>
      total + (page.averagePosition === null ? 0 : page.averagePosition * page.impressions),
    0
  );

  return {
    slug: cohort.slug,
    label: cohort.label,
    registeredPages: perPage.length,
    reachedPages: perPage.filter((page) => page.impressions > 0).length,
    clicks,
    impressions,
    ctr: impressions > 0 ? round(clicks / impressions, 4) : 0,
    medianClicksPerPage: median(perPage.map((page) => page.clicks)),
    medianImpressionsPerPage: median(perPage.map((page) => page.impressions)),
    distinctLongTailQueries: perPage.reduce((total, page) => total + page.longTailQueries, 0),
    impressionWeightedPosition: impressions > 0 ? round(weightedPositionTotal / impressions) : null,
    pages: perPage,
  };
}

function decisionFor(experiment, cohorts, observationDays) {
  const totalImpressions = cohorts.reduce((total, cohort) => total + cohort.impressions, 0);
  const minimumReached = Math.min(...cohorts.map((cohort) => cohort.reachedPages));
  if (
    observationDays < experiment.minimumWindowDays ||
    minimumReached < 3 ||
    totalImpressions < 100
  ) {
    return {
      status: "collecting",
      reason: `Need ${experiment.minimumWindowDays} equally aged days, at least three reached pages per cohort, and 100 non-branded impressions; current values are ${observationDays} days, ${minimumReached} minimum reached pages, and ${totalImpressions} impressions.`,
      allocation: cohorts.map((cohort) => ({
        cohort: cohort.slug,
        pages: experiment.nextBatchSize / cohorts.length,
      })),
    };
  }

  const ranked = [...cohorts].sort(
    (left, right) => right.medianImpressionsPerPage - left.medianImpressionsPerPage
  );
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const ratio =
    runnerUp.medianImpressionsPerPage === 0
      ? Number.POSITIVE_INFINITY
      : leader.medianImpressionsPerPage / runnerUp.medianImpressionsPerPage;

  if (ratio < 1.25) {
    return {
      status: "inconclusive",
      reason:
        "The cohort medians are less than 25% apart. Keep an even mix and use the page-level table to improve individual weak cases.",
      allocation: cohorts.map((cohort) => ({
        cohort: cohort.slug,
        pages: experiment.nextBatchSize / cohorts.length,
      })),
    };
  }

  const exploratoryPages = Math.round(experiment.nextBatchSize * experiment.explorationShare);
  return {
    status: "directional",
    leader: leader.slug,
    reason: `${leader.label} leads on the predeclared median-impressions metric. Treat this as a demand-allocation signal, not proof that format caused the result.`,
    allocation: [
      { cohort: leader.slug, pages: experiment.nextBatchSize - exploratoryPages },
      { cohort: runnerUp.slug, pages: exploratoryPages },
    ],
  };
}

export function analyzeRustAtlasGrowth({ experiment, searchAnalytics, startDate, endDate }) {
  const start = requireIsoDate(startDate, "startDate");
  const end = requireIsoDate(endDate, "endDate");
  if (end < start) throw new Error("endDate must not be before startDate");

  const observationDays = inclusiveDays(start, end);
  const pages = rowsByPage(searchAnalytics, experiment.dimensions);
  const paths = casePathsById();
  const cohorts = experiment.cohorts.map((cohort) => cohortSummary(cohort, pages, paths));

  return {
    experiment: experiment.id,
    window: { startDate, endDate, observationDays },
    note: "Search Console can omit low-volume rows. Compare equally aged cohorts and inspect page-level repetition; do not read this report as a causal ranking experiment.",
    cohorts,
    decision: decisionFor(experiment, cohorts, observationDays),
  };
}

export async function main(argumentsList = process.argv.slice(2)) {
  const file = argumentValue(argumentsList, "--gsc");
  const experimentId = argumentValue(argumentsList, "--experiment") || "RGE-001";
  const startDate = argumentValue(argumentsList, "--start");
  const endDate = argumentValue(argumentsList, "--end");
  if (!file || !startDate || !endDate) {
    throw new Error(
      "Usage: node scripts/analyze-rust-atlas-growth.mjs --gsc search-analytics.json --start YYYY-MM-DD --end YYYY-MM-DD [--experiment RGE-001]"
    );
  }

  const experiment = rustAtlasGrowthExperiments.find((candidate) => candidate.id === experimentId);
  if (!experiment) throw new Error(`Unknown Rust Atlas growth experiment: ${experimentId}`);
  const searchAnalytics = JSON.parse(await readFile(file, "utf8"));
  const report = analyzeRustAtlasGrowth({ experiment, searchAnalytics, startDate, endDate });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
