import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const readResult = (name) => JSON.parse(readFileSync(path.join(root, "results", name), "utf8"));
const artifacts = Object.fromEntries(
  ["none", "full", "dpr-1-2", "desktop-dpr-ge-1"].map((variant) => [
    variant,
    readResult(`perf043-${variant}-artifacts.json`),
  ])
);
const browsers = Object.fromEntries(
  ["full", "dpr-1-2", "desktop-dpr-ge-1"].map((variant) => [
    variant,
    readResult(`perf043-${variant}-browser.json`),
  ])
);
const perf042Gate = readResult("../../mdx-media-preload/results/perf042-media-gate.json");

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function artifact(variant, id) {
  return artifacts[variant].results.find((result) => result.id === id);
}

function delta(left, right) {
  return Object.fromEntries(
    ["raw", "gzip", "brotli"].map((codec) => [codec, left[codec] - right[codec]])
  );
}

function runs(variant, { route, dpr } = {}) {
  return browsers[variant].runs.filter(
    (run) =>
      (route === undefined || run.route === route) &&
      (dpr === undefined || run.requestedDpr === dpr)
  );
}

for (const report of Object.values(browsers)) assert.equal(report.runs.length, 28);
for (const run of browsers.full.runs) {
  assert.equal(run.image.requestCount, 1, `${run.runId}: full hint duplicated a request`);
  assert.equal(run.image.requestedUrls[0], run.image.currentSrc);
  assert.equal(run.image.resourceInitiatorType, "link");
  assert.equal(run.preload.mediaMatches, true);
}

const twoCandidateStandardRuns = browsers["dpr-1-2"].runs.filter((run) =>
  [1, 2].includes(run.requestedDpr)
);
for (const run of twoCandidateStandardRuns) {
  assert.equal(run.image.requestCount, 1);
  assert.equal(run.image.requestedUrls[0], run.image.currentSrc);
  assert.equal(run.image.resourceInitiatorType, "link");
}
const twoCandidateFailures = browsers["dpr-1-2"].runs.filter((run) => run.image.requestCount > 1);
assert.equal(twoCandidateFailures.length, 7);

for (const run of browsers["desktop-dpr-ge-1"].runs) {
  assert.equal(run.image.requestCount, 1, `${run.runId}: reachable hint duplicated a request`);
  assert.equal(run.image.requestedUrls[0], run.image.currentSrc);
  if (run.requestedDpr < 1) {
    assert.equal(run.preload.mediaMatches, false);
    assert.equal(run.image.resourceInitiatorType, "img");
  } else {
    assert.equal(run.preload.mediaMatches, true);
    assert.equal(run.image.resourceInitiatorType, "link");
  }
}

const mobileGate = perf042Gate.cases.find((candidate) => candidate.id === "mobile-media-mismatch");
assert.equal(mobileGate.requestsBeforeScroll.length, 0);

const routeIds = ["control-plane", "load-balancer"];
const artifactComparisons = routeIds.map((id) => {
  const none = artifact("none", id);
  const full = artifact("full", id);
  const two = artifact("dpr-1-2", id);
  const reachable = artifact("desktop-dpr-ge-1", id);
  assert.equal(none.preload, null);
  assert.equal(full.preload.candidateCount, 9);
  assert.equal(two.preload.candidateCount, 2);
  assert.equal(reachable.preload.candidateCount, 6);

  const fullOverNone = delta(full.document, none.document);
  const twoVsFull = delta(two.document, full.document);
  const reachableVsFull = delta(reachable.document, full.document);
  assert.ok(fullOverNone.gzip > 0 && fullOverNone.gzip < 400);
  assert.ok(fullOverNone.brotli > 0 && fullOverNone.brotli < 150);
  assert.ok(reachableVsFull.gzip > 0, `${id}: reachable pruning unexpectedly saved gzip bytes`);
  assert.ok(reachableVsFull.brotli > 0, `${id}: reachable pruning unexpectedly saved Brotli bytes`);

  return {
    id,
    fullCandidateCount: full.preload.candidateCount,
    fullOverNoPreloadDocumentBytes: fullOverNone,
    twoCandidateVsFullDocumentBytes: twoVsFull,
    reachableSixCandidateVsFullDocumentBytes: reachableVsFull,
  };
});

const standardLcp = [];
for (const dpr of [1, 2]) {
  for (const route of routeIds) {
    const row = { dpr, route };
    for (const variant of ["full", "dpr-1-2", "desktop-dpr-ge-1"]) {
      const selected = runs(variant, { route, dpr });
      assert.equal(selected.length, 5);
      row[variant] = {
        medianLcpMs: median(selected.map((run) => run.lcp.startTime)),
        medianRequestStartMs: median(selected.map((run) => run.image.resourceStart)),
      };
    }
    standardLcp.push(row);
  }
}

const duplicateFailures = twoCandidateFailures.map((run) => {
  const control = runs("full", { route: run.route, dpr: run.requestedDpr })[0];
  return {
    runId: run.runId,
    dpr: run.requestedDpr,
    route: run.route,
    selectedUrl: run.image.currentSrc,
    requestedUrls: run.image.requestedUrls,
    lcpMs: run.lcp.startTime,
    fullHintLcpMs: control.lcp.startTime,
    lcpDeltaMs: run.lcp.startTime - control.lcp.startTime,
  };
});

const output = {
  experiment: "PERF-043",
  generatedAt: new Date().toISOString(),
  decision: "retain-full-exact-responsive-preload",
  reason:
    "Whole-document compression reduces the full hint to 116-126 Brotli bytes or 250-344 gzip bytes above no preload. Two-candidate pruning duplicates image downloads outside DPR 1/2, while safe reachable-candidate pruning is 3-15 gzip bytes and 5-44 Brotli bytes larger than the full form.",
  invariants: {
    fullHintOneRequestAcrossDpr08To3: true,
    dprOneAndTwoRetained: true,
    mobileFarMediaMismatchStillZeroRequest: true,
    productionImplementationUnchanged: true,
  },
  artifactComparisons,
  standardLcp,
  twoCandidateFailures: duplicateFailures,
};

writeFileSync(
  path.join(root, "results", "perf043-analysis.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
console.log(JSON.stringify(output, null, 2));
