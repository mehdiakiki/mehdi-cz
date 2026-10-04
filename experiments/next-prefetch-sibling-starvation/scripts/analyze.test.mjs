import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeDatasets,
  compareControlledClicks,
  isFullPrefetchStarvedRun,
  isStarvedRun,
  median,
} from "./analyze.mjs";

function requestSummary(total, routeTree = 0, segment = 0) {
  return {
    total,
    routeTree,
    segment,
    routePayload: 0,
    fullPrefetch: 0,
    navigation: 0,
    other: 0,
    completed: total,
    failed: 0,
    encodedBytes: 0,
    decodedBodyBytes: 0,
  };
}

function run(overrides = {}) {
  return {
    routeKind: "partial",
    scenario: "imperative",
    count: 5,
    missingPrefetchPaths: [],
    missingTreePaths: [],
    prefetch: requestSummary(10, 5, 5),
    retry: { requests: requestSummary(0) },
    navigation: { requests: requestSummary(0), clickToContentMs: 10 },
    pageErrors: [],
    ...overrides,
  };
}

test("median handles odd, even, and absent values", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
});

test("controlled comparisons retain both improvements and regressions", () => {
  const rows = [
    {
      label: "stable",
      profile: "controlled",
      scenario: "imperative",
      count: 5,
      medianClickToContentMs: 180,
    },
    {
      label: "patched",
      profile: "controlled",
      scenario: "imperative",
      count: 5,
      medianClickToContentMs: 190,
    },
  ];
  assert.deepEqual(compareControlledClicks(rows, "stable", "patched", "imperative"), [
    { count: 5, stableMedianMs: 180, patchedMedianMs: 190, deltaMs: 10 },
  ]);
});

test("starvation requires an unfetched path, no-op retry, and click network", () => {
  assert.equal(isStarvedRun(run()), false);
  assert.equal(
    isStarvedRun(
      run({
        missingPrefetchPaths: ["/partial/alpha"],
        navigation: { requests: requestSummary(1), clickToContentMs: 40 },
      })
    ),
    true
  );
});

test("full-prefetch starvation is tracked separately from the default App Shell path", () => {
  const candidate = run({
    scenario: "imperative-full",
    missingPrefetchPaths: ["/partial/alpha"],
    navigation: { requests: requestSummary(1), clickToContentMs: 40 },
  });
  assert.equal(isStarvedRun(candidate), false);
  assert.equal(isFullPrefetchStarvedRun(candidate), true);
});

test("analysis distinguishes designed legacy waves from partial starvation", () => {
  const legacyRuns = [1, 4, 5, 7].map((count) =>
    run({
      routeKind: "static",
      scenario: "viewport-auto",
      count,
      prefetch: requestSummary(Math.min(count, 4) + count, Math.min(count, 4), count),
      retry: null,
      navigation: null,
    })
  );
  const starved = run({
    missingPrefetchPaths: ["/partial/alpha"],
    missingTreePaths: ["/partial/alpha"],
    prefetch: requestSummary(8, 4, 4),
    navigation: { requests: requestSummary(1), clickToContentMs: 50 },
  });
  const analysis = analyzeDatasets([
    {
      label: "stable-legacy-webpack",
      nextVersion: "16.3.4",
      cacheMode: "legacy",
      bundler: "webpack",
      generatedAt: "fixture",
      runs: legacyRuns,
    },
    {
      label: "stable-partial-webpack",
      nextVersion: "16.3.4",
      cacheMode: "partial",
      bundler: "webpack",
      generatedAt: "fixture",
      runs: [starved],
    },
  ]);

  assert.equal(analysis.findings.protocolAttributionConfirmed, true);
  assert.equal(analysis.findings.starvationObserved, true);
  assert.equal(analysis.findings.affectsWebpackAndTurbopack, false);
  assert.equal(analysis.findings.currentCanaryAffected, false);
  assert.deepEqual(analysis.findings.starvationBoundary, [
    { label: "stable-partial-webpack", bundler: "webpack", count: 5 },
  ]);
});
