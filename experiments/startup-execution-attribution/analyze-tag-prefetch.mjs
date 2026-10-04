import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routes } from "./fixture.mjs";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const before = JSON.parse(
  readFileSync(path.join(experimentRoot, "results/perf045-tag-before.json"), "utf8")
);
const after = JSON.parse(
  readFileSync(path.join(experimentRoot, "results/perf045-tag-after.json"), "utf8")
);

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function median(values) {
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distribution(values) {
  return {
    median: round(median(values)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
}

function summarize(input, profile, route, mode) {
  const runs = input.runs.filter(
    (run) => run.profile === profile && run.route === route && run.mode === mode
  );
  assert.equal(runs.length, input.method.repetitions, `${input.phase}/${profile}/${route}/${mode}`);
  return {
    runs: runs.length,
    lcpMs: distribution(runs.map((run) => run.lcpMs)),
    tagRscRequests: distribution(runs.map((run) => run.tagRscRequests.length)),
    tagRouteChunkRequests: distribution(runs.map((run) => run.tagRouteChunkRequests.length)),
    tagRscFinishedBytes: distribution(
      runs.map((run) =>
        run.tagRscRequests.reduce((total, request) => total + (request.encodedDataLength || 0), 0)
      )
    ),
    tagRouteChunkFinishedBytes: distribution(
      runs.map((run) =>
        run.tagRouteChunkRequests.reduce(
          (total, request) => total + (request.encodedDataLength || 0),
          0
        )
      )
    ),
  };
}

for (const run of [...before.runs, ...after.runs]) {
  assert.equal(run.targetImageRequests, 1, `${run.profile}/${run.route}/${run.mode}: target image`);
  assert.deepEqual(run.pageErrors, [], `${run.profile}/${run.route}/${run.mode}: page errors`);
}
for (const run of before.runs) {
  assert.equal(run.tagRscRequests.length, 11, `${run.profile}/${run.route}: before RSC count`);
  assert.equal(run.tagRouteChunkRequests.length, 1, `${run.profile}/${run.route}: before chunk`);
}
for (const run of after.runs.filter((candidate) => candidate.mode === "idle")) {
  assert.equal(run.tagRscRequests.length, 0, `${run.profile}/${run.route}: idle RSC`);
  assert.equal(run.tagRouteChunkRequests.length, 0, `${run.profile}/${run.route}: idle chunk`);
}
for (const run of after.runs.filter((candidate) => candidate.mode === "intent")) {
  assert.equal(run.tagRscRequests.length, 2, `${run.profile}/${run.route}: intent RSC`);
  assert.equal(run.tagRouteChunkRequests.length, 1, `${run.profile}/${run.route}: intent chunk`);
  assert.equal(
    new URL(run.intent.afterHoverUrl).pathname,
    routes.find((route) => route.id === run.route).path
  );
  assert.equal(new URL(run.intent.finalUrl).pathname, run.intent.href);
}

const groups = [];
const comparisons = [];
for (const profile of ["local", "controlled"]) {
  for (const route of ["control-plane", "load-balancer"]) {
    for (const mode of ["idle", "intent"]) {
      const beforeSummary = summarize(before, profile, route, mode);
      const afterSummary = summarize(after, profile, route, mode);
      groups.push({ phase: "before", profile, route, mode, ...beforeSummary });
      groups.push({ phase: "after", profile, route, mode, ...afterSummary });
      comparisons.push({
        profile,
        route,
        mode,
        lcpMs: {
          before: beforeSummary.lcpMs.median,
          after: afterSummary.lcpMs.median,
          delta: round(afterSummary.lcpMs.median - beforeSummary.lcpMs.median),
        },
        tagRscRequests: {
          before: beforeSummary.tagRscRequests.median,
          after: afterSummary.tagRscRequests.median,
          delta: afterSummary.tagRscRequests.median - beforeSummary.tagRscRequests.median,
        },
        tagRouteChunkRequests: {
          before: beforeSummary.tagRouteChunkRequests.median,
          after: afterSummary.tagRouteChunkRequests.median,
          delta:
            afterSummary.tagRouteChunkRequests.median - beforeSummary.tagRouteChunkRequests.median,
        },
      });
    }
  }
}

const result = {
  experiment: before.experiment,
  generatedAt: new Date().toISOString(),
  inputs: {
    before: "results/perf045-tag-before.json",
    after: "results/perf045-tag-after.json",
    beforeBuildId: before.buildId,
    afterBuildId: after.buildId,
    beforeTagSourceSha256: before.tagSourceSha256,
    afterTagSourceSha256: after.tagSourceSha256,
  },
  groups,
  comparisons,
  fullyObservedLocalIdleSavings: {
    controlPlaneBytes: 130_490 + 1_621,
    loadBalancerBytes: 129_277 + 1_621,
    requestCount: 12,
  },
  retainedIntentCost: {
    controlPlaneBytes: 19_667 + 1_585,
    loadBalancerBytes: 19_323 + 1_585,
    requestCount: 3,
    behavior: "one hovered tag warms and then completes a client-side navigation",
  },
  buildArtifacts: {
    before: {
      articleChunkRawBytes: 7_154,
      articleChunkGzipBytes: 2_919,
      tagRouteChunkRawBytes: 684,
      tagRouteChunkGzipBytes: 466,
    },
    after: {
      articleChunkRawBytes: 7_109,
      articleChunkGzipBytes: 2_913,
      tagRouteChunkRawBytes: 648,
      tagRouteChunkGzipBytes: 460,
    },
  },
  guardrails: {
    pageErrors: "zero in all 80 before/after rows",
    targetImage: "one request in all 80 before/after rows",
    idleTagRequests: "zero in all 20 after rows",
    intentNavigation: "20/20 after rows warmed one tag and reached its destination",
  },
};

writeFileSync(
  path.join(experimentRoot, "results/perf045-tag-analysis.json"),
  `${JSON.stringify(result, null, 2)}\n`
);
console.table(
  comparisons.map((entry) => ({
    profile: entry.profile,
    route: entry.route,
    mode: entry.mode,
    LCPBefore: entry.lcpMs.before,
    LCPAfter: entry.lcpMs.after,
    LCPDelta: entry.lcpMs.delta,
    RSCBefore: entry.tagRscRequests.before,
    RSCAfter: entry.tagRscRequests.after,
    ChunkBefore: entry.tagRouteChunkRequests.before,
    ChunkAfter: entry.tagRouteChunkRequests.after,
  }))
);
