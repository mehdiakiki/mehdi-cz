import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(experimentRoot, "results/perf045-theme-position.json");
const input = JSON.parse(readFileSync(inputPath, "utf8"));

function median(values) {
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const timingRuns = input.runs.filter((run) => !run.traceEnabled);
const traceRuns = input.runs.filter((run) => run.traceEnabled);
const timing = [];

for (const route of ["control-plane", "load-balancer"]) {
  for (const variant of input.method.variants) {
    const runs = timingRuns.filter((run) => run.route === route && run.variant === variant);
    assert.equal(runs.length, input.method.repetitions, `${route}/${variant}: timing rows`);
    timing.push({
      route,
      variant,
      runs: runs.length,
      lcpMedianMs: median(runs.map((run) => run.lcp.startTime)),
      lcpMinMs: Math.min(...runs.map((run) => run.lcp.startTime)),
      lcpMaxMs: Math.max(...runs.map((run) => run.lcp.startTime)),
      targetImageRequestMedian: median(runs.map((run) => run.image.requestCount)),
      pageErrorRows: runs.filter((run) => run.pageErrors.length > 0).length,
    });
  }
}

const earlyFullTraces = traceRuns.filter((run) => run.variant === "early-theme-full");
const retainedFullTraces = traceRuns.filter((run) => run.variant === "full");
assert.equal(earlyFullTraces.length, 4, "early-theme-full trace rows");
assert.equal(retainedFullTraces.length, 4, "full trace rows");
for (const run of earlyFullTraces) {
  assert.equal(run.image.requestCount, 2, `${run.runId}: duplicated target image`);
  assert.equal(run.pageErrors.length, 1, `${run.runId}: hydration error`);
}
for (const run of retainedFullTraces) {
  assert.equal(run.image.requestCount, 1, `${run.runId}: retained target image`);
  assert.deepEqual(run.pageErrors, [], `${run.runId}: retained page errors`);
}

const result = {
  experiment: "PERF-045 theme-bootstrap position follow-up",
  generatedAt: new Date().toISOString(),
  input: "results/perf045-theme-position.json",
  timing,
  rejectedCandidate: {
    variant: "early-theme-full",
    symptom: "4/4 traced rows raised a React hydration error and fetched the LCP image twice",
    targetImageRequests: {
      retainedFull: retainedFullTraces.map((run) => run.image.requestCount),
      earlyThemeFull: earlyFullTraces.map((run) => run.image.requestCount),
    },
    decision:
      "Reject DOM relocation; a safe head bootstrap needs a hydration-preserving framework or library API",
  },
};

const outputPath = path.join(experimentRoot, "results/perf045-theme-position-analysis.json");
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.table(timing);
console.log(`Wrote ${outputPath}`);
