import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(
  process.argv[2] || path.join(experimentRoot, "results/perf044-measurement.json")
);
const outputPath = path.resolve(
  process.argv[3] || path.join(experimentRoot, "results/perf044-analysis.json")
);
const input = JSON.parse(readFileSync(inputPath, "utf8"));

function round(value, places = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function median(values) {
  const finite = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!finite.length) return null;
  const middle = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[middle] : (finite[middle - 1] + finite[middle]) / 2;
}

function distribution(values) {
  const finite = values.filter(Number.isFinite);
  return {
    median: round(median(finite)),
    min: finite.length ? round(Math.min(...finite)) : null,
    max: finite.length ? round(Math.max(...finite)) : null,
  };
}

function runMetrics(run) {
  const resourceEnd = run.image.resource?.responseEnd;
  const lcp = run.lcp?.startTime;
  const fcp = run.paints.find((entry) => entry.name === "first-contentful-paint")?.startTime;
  return {
    lcpMs: lcp,
    fcpMs: fcp,
    resourceStartMs: run.image.resource?.startTime,
    imageResponseEndMs: resourceEnd,
    imageLoadMs: run.targetLifecycle.load,
    firstLayoutReadyMs: run.targetLifecycle.firstResize,
    renderDelayMs: lcp - resourceEnd,
    responseEndToImageLoadMs: run.targetLifecycle.load - resourceEnd,
    imageLoadToLcpMs: lcp - run.targetLifecycle.load,
    cssReadyToLcpMs: lcp - run.css.lastResponseEnd,
    domSeenToLcpMs: lcp - run.targetLifecycle.domSeen,
    firstLayoutReadyToLcpMs: lcp - run.targetLifecycle.firstResize,
    lcpEntryLoadToRenderMs: run.lcp?.renderTime - run.lcp?.loadTime,
    navigationResponseEndMs: run.navigation.responseEnd,
    documentResponseEndToDclMs: run.navigation.domContentLoaded - run.navigation.responseEnd,
    dclToLcpMs: lcp - run.navigation.domContentLoaded,
    domContentLoadedMs: run.navigation.domContentLoaded,
    loadMs: run.navigation.load,
    cls: run.cls,
    requestCount: run.image.requestCount,
    scriptRequests: run.networkScriptRequests,
    elements: run.document.elements,
    inlineFlightBytes: run.document.inlineFlightBytes,
    longTaskDurationAfterImageMs: run.longTasksAfterImage.totalDuration,
    x: run.image.rect.x,
    y: run.image.rect.y,
    width: run.image.rect.width,
    height: run.image.rect.height,
  };
}

const metricNames = [
  "lcpMs",
  "fcpMs",
  "resourceStartMs",
  "imageResponseEndMs",
  "imageLoadMs",
  "firstLayoutReadyMs",
  "renderDelayMs",
  "responseEndToImageLoadMs",
  "imageLoadToLcpMs",
  "cssReadyToLcpMs",
  "domSeenToLcpMs",
  "firstLayoutReadyToLcpMs",
  "lcpEntryLoadToRenderMs",
  "navigationResponseEndMs",
  "documentResponseEndToDclMs",
  "dclToLcpMs",
  "domContentLoadedMs",
  "loadMs",
  "cls",
  "requestCount",
  "scriptRequests",
  "elements",
  "inlineFlightBytes",
  "longTaskDurationAfterImageMs",
  "x",
  "y",
  "width",
  "height",
];

function summarizeRuns(runs) {
  return Object.fromEntries(
    metricNames.map((name) => [name, distribution(runs.map((run) => runMetrics(run)[name]))])
  );
}

const timingRuns = input.runs.filter((run) => !run.traceEnabled);
const groups = [];
for (const profile of input.method.profiles.map((entry) => entry.id)) {
  for (const route of [...new Set(input.runs.map((run) => run.route))]) {
    for (const variant of input.method.variants) {
      const runs = timingRuns.filter(
        (run) => run.profile === profile && run.route === route && run.variant === variant
      );
      assert.equal(
        runs.length,
        input.method.repetitions,
        `${profile}/${route}/${variant} run count`
      );
      groups.push({ profile, route, variant, runs: runs.length, summary: summarizeRuns(runs) });
    }
  }
}

const comparisonMetrics = [
  "lcpMs",
  "fcpMs",
  "renderDelayMs",
  "responseEndToImageLoadMs",
  "imageLoadToLcpMs",
  "cssReadyToLcpMs",
  "navigationResponseEndMs",
  "documentResponseEndToDclMs",
  "dclToLcpMs",
  "domContentLoadedMs",
  "loadMs",
  "longTaskDurationAfterImageMs",
];
const comparisons = groups
  .filter((group) => group.variant !== "full")
  .map((candidate) => {
    const baseline = groups.find(
      (group) =>
        group.profile === candidate.profile &&
        group.route === candidate.route &&
        group.variant === "full"
    );
    const metrics = Object.fromEntries(
      comparisonMetrics.map((name) => {
        const before = baseline.summary[name].median;
        const after = candidate.summary[name].median;
        return [
          name,
          {
            before,
            after,
            delta: round(after - before),
            percent: before === 0 ? null : round(((after - before) / before) * 100),
          },
        ];
      })
    );
    return {
      profile: candidate.profile,
      route: candidate.route,
      variant: candidate.variant,
      metrics,
    };
  });

function digest(filename) {
  return createHash("sha256").update(readFileSync(filename)).digest("hex");
}

function clip(event, start, end) {
  const eventEnd = event.ts + (event.dur || 0);
  const clippedStart = Math.max(event.ts, start);
  const clippedEnd = Math.min(eventEnd, end);
  return clippedEnd > clippedStart ? [clippedStart, clippedEnd] : null;
}

function unionMicroseconds(intervals) {
  if (!intervals.length) return 0;
  const sorted = intervals.toSorted((left, right) => left[0] - right[0]);
  let total = 0;
  let [start, end] = sorted[0];
  for (const [nextStart, nextEnd] of sorted.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else {
      total += end - start;
      start = nextStart;
      end = nextEnd;
    }
  }
  return total + end - start;
}

function phase(events, start, end, names, predicate) {
  const matching = events.filter(
    (event) =>
      event.ph === "X" &&
      names.has(event.name) &&
      (!predicate || predicate(event)) &&
      clip(event, start, end)
  );
  const intervals = matching.map((event) => clip(event, start, end));
  return {
    count: matching.length,
    wallCoverageMs: round(unionMicroseconds(intervals) / 1_000),
    firstOffsetMs: matching.length
      ? round((Math.min(...matching.map((event) => Math.max(event.ts, start))) - start) / 1_000)
      : null,
    lastEndOffsetMs: matching.length
      ? round(
          (Math.max(...matching.map((event) => Math.min(event.ts + event.dur, end))) - start) /
            1_000
        )
      : null,
  };
}

const phaseNames = {
  mainThreadTask: new Set(["RunTask", "ThreadControllerImpl::RunTask"]),
  htmlParser: new Set(["ParseHTML"]),
  javascript: new Set([
    "EvaluateScript",
    "EventDispatch",
    "FunctionCall",
    "RunMicrotasks",
    "v8.callFunction",
    "v8.run",
  ]),
  backgroundScriptParse: new Set(["v8.parseOnBackgroundParsing"]),
  styleLayout: new Set(["RecalculateStyles", "UpdateLayoutTree", "Layout"]),
  prePaintPaint: new Set(["PrePaint", "Paint", "PaintImage"]),
  imageDecode: new Set([
    "Decode Image",
    "Decode LazyPixelRef",
    "ImageController::ProcessNextImageDecodeOnWorkerThread",
    "ImageDecodeTask",
    "SoftwareImageDecodeCache::DecodeImageInTask",
    "SoftwareImageDecodeTaskImpl::RunOnWorkerThread",
  ]),
  raster: new Set(["RasterTask", "RasterizerTaskImpl::RunOnWorkerThread"]),
  compositor: new Set([
    "ActivateLayerTree",
    "Commit",
    "LayerTreeHostImpl::CommitComplete",
    "MainFrame.Draw",
    "ProxyImpl::ScheduledActionDraw",
    "SingleThreadProxy::DoComposite",
    "SubmitCompositorFrame",
  ]),
};

function analyzeTrace(run) {
  const tracePath = run.traceArtifact?.path;
  if (!tracePath) throw new Error(`Missing trace artifact for ${run.runId}`);
  assert.equal(statSync(tracePath).size, run.traceArtifact.bytes, `${run.runId} trace bytes`);
  assert.equal(digest(tracePath), run.traceArtifact.sha256, `${run.runId} trace digest`);
  const events = JSON.parse(readFileSync(tracePath, "utf8")).traceEvents;
  const navigation = events.find(
    (event) =>
      event.name === "navigationStart" &&
      event.args?.data?.documentLoaderURL?.includes(`perf044_run=${run.runId}`)
  );
  if (!navigation) throw new Error(`Cannot find navigation for ${run.runId}`);
  const imageRequest = events.find(
    (event) =>
      event.name === "ResourceSendRequest" &&
      event.args?.data?.resourceType === "Image" &&
      event.args.data.url === run.image.requestUrls[0]
  );
  if (!imageRequest) throw new Error(`Cannot find target image request for ${run.runId}`);
  const finish = events.find(
    (event) =>
      event.name === "ResourceFinish" &&
      event.args?.data?.requestId === imageRequest.args.data.requestId
  );
  if (!finish) throw new Error(`Cannot find target image finish for ${run.runId}`);
  const start = finish.ts;
  const end = navigation.ts + run.lcp.startTime * 1_000;
  const mainThread = (event) => event.pid === navigation.pid && event.tid === navigation.tid;
  const renderer = (event) => event.pid === navigation.pid;
  const phases = {
    mainThreadTask: phase(events, start, end, phaseNames.mainThreadTask, mainThread),
    htmlParser: phase(events, start, end, phaseNames.htmlParser, mainThread),
    javascript: phase(events, start, end, phaseNames.javascript, mainThread),
    backgroundScriptParse: phase(events, start, end, phaseNames.backgroundScriptParse, renderer),
    styleLayout: phase(events, start, end, phaseNames.styleLayout, mainThread),
    prePaintPaint: phase(events, start, end, phaseNames.prePaintPaint, mainThread),
    imageDecode: phase(events, start, end, phaseNames.imageDecode, renderer),
    raster: phase(events, start, end, phaseNames.raster, renderer),
    compositor: phase(events, start, end, phaseNames.compositor, (event) => !mainThread(event)),
  };
  const scriptRequests = events.filter(
    (event) =>
      event.name === "ResourceSendRequest" &&
      event.ts >= navigation.ts &&
      event.args?.data?.resourceType === "Script" &&
      event.args.data.initiator?.type === "parser"
  );
  const scriptRequestIds = new Set(scriptRequests.map((event) => event.args.data.requestId));
  const scriptFinishes = events.filter(
    (event) => event.name === "ResourceFinish" && scriptRequestIds.has(event.args?.data?.requestId)
  );
  const scriptData = events.filter(
    (event) =>
      event.name === "ResourceReceivedData" && scriptRequestIds.has(event.args?.data?.requestId)
  );
  const receivedScriptBytesBy = (timestamp) =>
    scriptData
      .filter((event) => event.ts <= timestamp)
      .reduce((total, event) => total + (event.args.data.encodedDataLength || 0), 0);
  return {
    runId: run.runId,
    profile: run.profile,
    route: run.route,
    variant: run.variant,
    traceArtifact: run.traceArtifact,
    eventCount: events.length,
    window: {
      traceImageFinishOffsetMs: round((finish.ts - navigation.ts) / 1_000),
      performanceImageResponseEndMs: run.image.resource.responseEnd,
      clockAlignmentDeltaMs: round(
        (finish.ts - navigation.ts) / 1_000 - run.image.resource.responseEnd
      ),
      imageFinishToLcpMs: round((end - start) / 1_000),
    },
    phases,
    network: {
      scripts: {
        sent: scriptRequests.length,
        finished: scriptFinishes.length,
        encodedBytes: scriptFinishes.reduce(
          (total, event) => total + (event.args.data.encodedDataLength || 0),
          0
        ),
        decodedBytes: scriptFinishes.reduce(
          (total, event) => total + (event.args.data.decodedBodyLength || 0),
          0
        ),
        priorities: scriptRequests.map((event) => event.args.data.priority),
        urls: scriptRequests.map((event) => event.args.data.url),
        linkPreloads: scriptRequests.filter((event) => event.args.data.isLinkPreload).length,
        receivedByImageFinish: receivedScriptBytesBy(start),
        receivedByLcp: receivedScriptBytesBy(end),
      },
    },
  };
}

const traceRuns = input.runs.filter((run) => run.traceEnabled).map(analyzeTrace);
const traceGroups = [];
for (const profile of input.method.profiles.map((entry) => entry.id)) {
  for (const route of [...new Set(input.runs.map((run) => run.route))]) {
    for (const variant of input.method.variants) {
      const runs = traceRuns.filter(
        (run) => run.profile === profile && run.route === route && run.variant === variant
      );
      assert.equal(runs.length, input.method.traceRepetitions);
      traceGroups.push({
        profile,
        route,
        variant,
        runs: runs.length,
        imageFinishToLcpMs: distribution(runs.map((run) => run.window.imageFinishToLcpMs)),
        clockAlignmentDeltaMs: distribution(runs.map((run) => run.window.clockAlignmentDeltaMs)),
        phases: Object.fromEntries(
          Object.keys(phaseNames).map((name) => [
            name,
            {
              wallCoverageMs: distribution(runs.map((run) => run.phases[name].wallCoverageMs)),
              count: distribution(runs.map((run) => run.phases[name].count)),
            },
          ])
        ),
        network: {
          scripts: {
            sent: distribution(runs.map((run) => run.network.scripts.sent)),
            finished: distribution(runs.map((run) => run.network.scripts.finished)),
            encodedBytes: distribution(runs.map((run) => run.network.scripts.encodedBytes)),
            decodedBytes: distribution(runs.map((run) => run.network.scripts.decodedBytes)),
            linkPreloads: distribution(runs.map((run) => run.network.scripts.linkPreloads)),
            receivedByImageFinish: distribution(
              runs.map((run) => run.network.scripts.receivedByImageFinish)
            ),
            receivedByLcp: distribution(runs.map((run) => run.network.scripts.receivedByLcp)),
          },
        },
      });
    }
  }
}

for (const profile of input.method.profiles.map((entry) => entry.id)) {
  for (const route of [...new Set(input.runs.map((run) => run.route))]) {
    const full = traceRuns.filter(
      (run) => run.profile === profile && run.route === route && run.variant === "full"
    );
    const inert = traceRuns.filter(
      (run) => run.profile === profile && run.route === route && run.variant === "script-inert"
    );
    assert.equal(inert.length, full.length, `${profile}/${route}: inert trace count`);
    for (let index = 0; index < full.length; index += 1) {
      assert.equal(inert[index].network.scripts.sent, full[index].network.scripts.sent);
      assert.deepEqual(inert[index].network.scripts.urls, full[index].network.scripts.urls);
      assert.equal(
        inert[index].network.scripts.receivedByImageFinish,
        full[index].network.scripts.receivedByImageFinish
      );
      assert.equal(
        inert[index].network.scripts.receivedByLcp,
        full[index].network.scripts.receivedByLcp
      );
      assert.deepEqual(new Set(inert[index].network.scripts.priorities), new Set(["Low"]));
      assert.deepEqual(new Set(full[index].network.scripts.priorities), new Set(["Low"]));
    }
  }
}

for (const run of input.runs) {
  assert.equal(run.image.requestCount, 1, `${run.runId}: target image request count`);
  assert.equal(run.lcp?.alt, run.targetAlt, `${run.runId}: target must remain LCP`);
  assert.equal(
    new URL(run.image.currentSrc).searchParams.get("w"),
    "828",
    `${run.runId}: candidate`
  );
  assert.ok(run.cls <= 0.01, `${run.runId}: CLS ${run.cls}`);
  assert.equal(run.targetHeading?.length > 0, true, `${run.runId}: article heading`);
}

for (const profile of input.method.profiles.map((entry) => entry.id)) {
  for (const route of [...new Set(input.runs.map((run) => run.route))]) {
    const baseline = groups.find(
      (group) => group.profile === profile && group.route === route && group.variant === "full"
    );
    for (const candidate of groups.filter(
      (group) => group.profile === profile && group.route === route
    )) {
      for (const metric of ["x", "y", "width", "height"]) {
        assert.ok(
          Math.abs(candidate.summary[metric].median - baseline.summary[metric].median) <= 0.5,
          `${profile}/${route}/${candidate.variant}: ${metric} geometry drift`
        );
      }
      assert.ok(
        candidate.summary.cls.median <= baseline.summary.cls.median + 0.001,
        `${profile}/${route}/${candidate.variant}: CLS regression`
      );
    }
  }
}

const result = {
  experiment: input.experiment,
  generatedAt: new Date().toISOString(),
  input: path.relative(experimentRoot, inputPath),
  method: input.method,
  groups,
  comparisons,
  traceRuns,
  traceGroups,
  guardrails: {
    targetImageRequests: "one in every timing and trace row",
    selectedCandidate: "828w in every row",
    lcpIdentity: "target image in every row",
    cls: "<= 0.01 in every row; no variant median exceeds full by > 0.001",
    geometry: "variant medians within 0.5 CSS px of full",
  },
};
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.table(
  groups.map((group) => ({
    profile: group.profile,
    route: group.route,
    variant: group.variant,
    LCP: group.summary.lcpMs.median,
    "post-response": group.summary.renderDelayMs.median,
    "image-load-to-LCP": group.summary.imageLoadToLcpMs.median,
    DCL: group.summary.domContentLoadedMs.median,
    CLS: group.summary.cls.median,
  }))
);
console.log(`Wrote ${outputPath}`);
