import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const inputNames = (
  process.env.PERF039_INPUTS ||
  "perf039-controlled-navigation.json,perf039-constrained-navigation.json"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const outputName = process.env.PERF039_ANALYSIS_OUTPUT || "perf039-analysis.json";
const policies = ["legacy-responsive", "fixed-40"];

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

function clipEvent(event, start, end) {
  const eventEnd = event.ts + (event.dur ?? 0);
  const clippedStart = Math.max(event.ts, start);
  const clippedEnd = Math.min(eventEnd, end);
  return clippedEnd > clippedStart ? [clippedStart, clippedEnd] : null;
}

function unionMicroseconds(intervals) {
  if (!intervals.length) return 0;
  const ordered = intervals.toSorted((left, right) => left[0] - right[0]);
  let total = 0;
  let [start, end] = ordered[0];
  for (const [nextStart, nextEnd] of ordered.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else {
      total += end - start;
      start = nextStart;
      end = nextEnd;
    }
  }
  return total + end - start;
}

function summarizePhase(events, start, end, names, predicate = () => true) {
  const matching = events.filter(
    (event) =>
      event.ph === "X" &&
      names.includes(event.name) &&
      predicate(event) &&
      clipEvent(event, start, end)
  );
  const clipped = matching.map((event) => clipEvent(event, start, end));
  return {
    count: matching.length,
    cpuMs: round(matching.reduce((total, event) => total + (event.dur ?? 0), 0) / 1_000),
    overlapMs: round(
      clipped.reduce((total, interval) => total + interval[1] - interval[0], 0) / 1_000
    ),
    wallMs: round(unionMicroseconds(clipped) / 1_000),
    maxMs: round(Math.max(0, ...matching.map((event) => event.dur ?? 0)) / 1_000),
    firstOffsetMs: matching.length
      ? round((Math.min(...matching.map((event) => event.ts)) - start) / 1_000)
      : null,
    lastEndOffsetMs: matching.length
      ? round((Math.max(...matching.map((event) => event.ts + (event.dur ?? 0))) - start) / 1_000)
      : null,
  };
}

function findTraceMarker(events, name, frame) {
  return events.find((event) => event.name === name && (!frame || event.args?.frame === frame));
}

function analyzeTrace(run) {
  const tracePath = run.traceArtifact?.path;
  if (!tracePath) throw new Error(`Missing trace artifact for ${run.runId}`);
  const traceBody = readFileSync(tracePath);
  const digest = createHash("sha256").update(traceBody).digest("hex");
  if (digest !== run.traceArtifact.sha256 || traceBody.length !== run.traceArtifact.bytes) {
    throw new Error(`Trace artifact integrity check failed for ${tracePath}`);
  }
  const trace = JSON.parse(traceBody);
  const events = trace.traceEvents;
  const navigation = events.find(
    (event) =>
      event.name === "navigationStart" &&
      event.args?.data?.isOutermostMainFrame === true &&
      event.args.data.documentLoaderURL?.includes("/article")
  );
  if (!navigation) throw new Error(`Cannot find target navigation in ${tracePath}`);
  const frame = navigation.args.frame;
  const navigationId = navigation.args.data.navigationId;
  const activation = findTraceMarker(events, "activationStart", frame);
  const fcp = events.find(
    (event) =>
      event.name === "firstContentfulPaint" &&
      event.args?.frame === frame &&
      event.args?.data?.navigationId === navigationId
  );
  if (!activation || !fcp) {
    throw new Error(`Cannot align activation and FCP in ${tracePath}`);
  }
  const start = activation.ts;
  const end = fcp.ts;
  const rendererPid = navigation.pid;
  const browserCommit = summarizePhase(events, start, end, [
    "NavigationRequest::CommitPageActivation",
  ]);
  const didCommit = summarizePhase(events, start, end, [
    "RenderFrameHostImpl::DidCommitPageActivation",
  ]);
  const beginMainFrame = summarizePhase(
    events,
    start,
    end,
    ["ProxyMain::BeginMainFrame"],
    (event) => event.pid === rendererPid
  );
  const raster = summarizePhase(events, start, end, ["RasterTask"], (event) => {
    return event.pid === rendererPid;
  });
  const decode = summarizePhase(
    events,
    start,
    end,
    ["SoftwareImageDecodeCache::DecodeImageInTask"],
    (event) => event.pid === rendererPid
  );
  const decodeEvent = events
    .filter(
      (event) =>
        event.name === "SoftwareImageDecodeCache::DecodeImageInTask" &&
        event.pid === rendererPid &&
        clipEvent(event, start, end)
    )
    .sort((left, right) => (right.dur ?? 0) - (left.dur ?? 0))[0];
  const imageRequest = events.find(
    (event) =>
      event.name === "ResourceSendRequest" &&
      event.args?.data?.frame === frame &&
      event.args.data.url?.includes("mehdi_image_enhanced_square.webp")
  );
  const requestId = imageRequest?.args?.data?.requestId;
  const imageFinish = events.find(
    (event) => event.name === "ResourceFinish" && event.args?.data?.requestId === requestId
  );
  const imageUrl = imageRequest ? new URL(imageRequest.args.data.url) : null;

  return {
    profile: run.transport.profile.name,
    runId: run.runId,
    repetition: run.repetition,
    avatarSizePolicy: run.avatarSizePolicy,
    traceArtifact: {
      path: tracePath,
      bytes: statSync(tracePath).size,
      sha256: digest,
      eventCount: events.length,
    },
    alignment: {
      traceNavigationToActivationMs: round((activation.ts - navigation.ts) / 1_000),
      performanceNavigationToActivationMs: round(run.activationStart),
      activationDeltaMs: round((activation.ts - navigation.ts) / 1_000 - run.activationStart),
      traceNavigationToFcpMs: round((fcp.ts - navigation.ts) / 1_000),
      performanceNavigationToFcpMs: round(run.firstContentfulPaint),
      fcpDeltaMs: round((fcp.ts - navigation.ts) / 1_000 - run.firstContentfulPaint),
      activationToFcpMs: round((end - start) / 1_000),
    },
    image: {
      selectedWidth: imageUrl ? Number(imageUrl.searchParams.get("w")) : null,
      decodedBodyBytes: imageFinish?.args?.data?.decodedBodyLength ?? null,
      responseFinishedBeforeActivationMs: imageFinish
        ? round((start - imageFinish.ts) / 1_000)
        : null,
      decodeKey: decodeEvent?.args?.key ?? null,
    },
    phases: {
      browserCommit,
      didCommit,
      beginMainFrame,
      style: summarizePhase(
        events,
        start,
        end,
        ["UpdateLayoutTree", "RecalculateStyles"],
        (event) => event.pid === rendererPid
      ),
      layout: summarizePhase(events, start, end, ["Layout"], (event) => event.pid === rendererPid),
      prePaint: summarizePhase(
        events,
        start,
        end,
        ["PrePaint"],
        (event) => event.pid === rendererPid
      ),
      paint: summarizePhase(events, start, end, ["Paint"], (event) => event.pid === rendererPid),
      raster,
      imageDecode: decode,
      javascript: summarizePhase(
        events,
        start,
        end,
        ["EvaluateScript", "FunctionCall", "EventDispatch"],
        (event) => event.pid === rendererPid
      ),
    },
    gaps: {
      commitEndToMainFrameMs:
        didCommit.lastEndOffsetMs !== null && beginMainFrame.firstOffsetMs !== null
          ? round(beginMainFrame.firstOffsetMs - didCommit.lastEndOffsetMs)
          : null,
      mainFrameEndToRasterMs:
        beginMainFrame.lastEndOffsetMs !== null && raster.firstOffsetMs !== null
          ? round(raster.firstOffsetMs - beginMainFrame.lastEndOffsetMs)
          : null,
      rasterEndToFcpMs:
        raster.lastEndOffsetMs !== null
          ? round((end - start) / 1_000 - raster.lastEndOffsetMs)
          : null,
    },
  };
}

const inputs = inputNames.map((name) => {
  const inputPath = path.resolve(fixtureRoot, "results", name);
  return { path: inputPath, document: JSON.parse(readFileSync(inputPath, "utf8")) };
});
const runs = inputs.flatMap(({ document }) => document.rawRuns);
const traceRuns = runs.filter((run) => run.traceEnabled).map(analyzeTrace);
const profiles = [...new Set(runs.map((run) => run.transport.profile.name))];

const measurements = profiles.flatMap((profile) =>
  policies.flatMap((avatarSizePolicy) =>
    [false, true].map((traceEnabled) => {
      const samples = runs.filter(
        (run) =>
          run.transport.profile.name === profile &&
          run.avatarSizePolicy === avatarSizePolicy &&
          run.traceEnabled === traceEnabled
      );
      return {
        profile,
        avatarSizePolicy,
        traceEnabled,
        runs: samples.length,
        activationSuccesses: samples.filter((run) => run.activationStart > 0).length,
        clickToFcpMs: distribution(samples.map((run) => run.clickToFirstContentfulPaint)),
        targetBytes: distribution(samples.map((run) => run.transport.target.sentBodyBytes)),
        articleBytes: distribution(samples.map((run) => run.transport.target.articleSentBodyBytes)),
        avatarCandidateWidth: distribution(samples.map((run) => run.avatar?.candidateWidth)),
        avatarEncodedBodyBytes: distribution(samples.map((run) => run.avatar?.encodedBodySize)),
      };
    })
  )
);

function measurement(profile, avatarSizePolicy, traceEnabled) {
  return measurements.find(
    (row) =>
      row.profile === profile &&
      row.avatarSizePolicy === avatarSizePolicy &&
      row.traceEnabled === traceEnabled
  );
}

const comparisons = profiles.map((profile) => {
  const legacy = measurement(profile, "legacy-responsive", false);
  const fixed = measurement(profile, "fixed-40", false);
  return {
    profile,
    targetByteSavings: legacy.targetBytes.median - fixed.targetBytes.median,
    targetByteSavingsPercent: round(
      ((legacy.targetBytes.median - fixed.targetBytes.median) / legacy.targetBytes.median) * 100,
      1
    ),
    avatarByteSavings: legacy.avatarEncodedBodyBytes.median - fixed.avatarEncodedBodyBytes.median,
    avatarByteSavingsPercent: round(
      ((legacy.avatarEncodedBodyBytes.median - fixed.avatarEncodedBodyBytes.median) /
        legacy.avatarEncodedBodyBytes.median) *
        100,
      1
    ),
    untracedClickToFcpDeltaMs: round(fixed.clickToFcpMs.median - legacy.clickToFcpMs.median),
    traceOverheadMs: Object.fromEntries(
      policies.map((policy) => [
        policy,
        round(
          measurement(profile, policy, true).clickToFcpMs.median -
            measurement(profile, policy, false).clickToFcpMs.median
        ),
      ])
    ),
  };
});

const traceAttribution = profiles.flatMap((profile) =>
  policies.map((avatarSizePolicy) => {
    const samples = traceRuns.filter(
      (run) => run.profile === profile && run.avatarSizePolicy === avatarSizePolicy
    );
    return {
      profile,
      avatarSizePolicy,
      runs: samples.length,
      activationToFcpMs: distribution(samples.map((run) => run.alignment.activationToFcpMs)),
      activationAlignmentDeltaMs: distribution(
        samples.map((run) => run.alignment.activationDeltaMs)
      ),
      fcpAlignmentDeltaMs: distribution(samples.map((run) => run.alignment.fcpDeltaMs)),
      browserCommitMs: distribution(samples.map((run) => run.phases.browserCommit.wallMs)),
      commitEndToMainFrameMs: distribution(samples.map((run) => run.gaps.commitEndToMainFrameMs)),
      beginMainFrameMs: distribution(samples.map((run) => run.phases.beginMainFrame.wallMs)),
      styleMs: distribution(samples.map((run) => run.phases.style.wallMs)),
      layoutMs: distribution(samples.map((run) => run.phases.layout.wallMs)),
      prePaintMs: distribution(samples.map((run) => run.phases.prePaint.wallMs)),
      paintMs: distribution(samples.map((run) => run.phases.paint.wallMs)),
      rasterWallMs: distribution(samples.map((run) => run.phases.raster.wallMs)),
      rasterCpuMs: distribution(samples.map((run) => run.phases.raster.cpuMs)),
      rasterEndToFcpMs: distribution(samples.map((run) => run.gaps.rasterEndToFcpMs)),
      imageDecodeMaxMs: distribution(samples.map((run) => run.phases.imageDecode.maxMs)),
      imageDecodeCpuMs: distribution(samples.map((run) => run.phases.imageDecode.cpuMs)),
      javascriptMs: distribution(samples.map((run) => run.phases.javascript.wallMs)),
      selectedWidth: distribution(samples.map((run) => run.image.selectedWidth)),
      imageDecodedBodyBytes: distribution(samples.map((run) => run.image.decodedBodyBytes)),
      imageFinishedBeforeActivationMs: distribution(
        samples.map((run) => run.image.responseFinishedBeforeActivationMs)
      ),
      decodeKeys: [...new Set(samples.map((run) => run.image.decodeKey).filter(Boolean))],
    };
  })
);

const exactByteWin = comparisons.every(
  (comparison) => comparison.targetByteSavings > 0 && comparison.avatarByteSavings > 0
);
const selectionIsRightSized = measurements
  .filter((row) => row.avatarSizePolicy === "fixed-40")
  .every((row) => row.avatarCandidateWidth.median === 96);
const decodeWorkReduced = profiles.every((profile) => {
  const legacy = traceAttribution.find(
    (row) => row.profile === profile && row.avatarSizePolicy === "legacy-responsive"
  );
  const fixed = traceAttribution.find(
    (row) => row.profile === profile && row.avatarSizePolicy === "fixed-40"
  );
  return fixed.imageDecodeMaxMs.median < legacy.imageDecodeMaxMs.median;
});
const fcpDirection = comparisons.map((comparison) => comparison.untracedClickToFcpDeltaMs);

const output = {
  generatedAt: new Date().toISOString(),
  experiment: "PERF-039 detached prerender activation trace and avatar source-selection test",
  decision:
    exactByteWin && selectionIsRightSized && decodeWorkReduced
      ? "adopt-fixed-avatar-sizing-for-exact-byte-and-decode-work-reduction"
      : "do-not-adopt-without-more-evidence",
  claims: {
    exactByteWin,
    selectionIsRightSized,
    decodeWorkReduced,
    fcpDirectionallyFasterInEveryProfile: fcpDirection.every((value) => value < 0),
    fcpDirectionallySlowerInEveryProfile: fcpDirection.every((value) => value > 0),
  },
  inputs: inputs.map(({ path: inputPath, document }) => ({
    path: inputPath,
    generatedAt: document.generatedAt,
    node: document.runtime.node,
    chrome: document.runtime.chrome,
    transport: document.profile.transport,
  })),
  method: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    comparison:
      "Fresh detached Chrome per run; identical staged prerender, CSS-first head, immutable shared assets, and 1 KiB early compressed prefix; only avatar sizes/srcset and startup tracing vary.",
    traceAlignment:
      "The target frame's navigationStart/navigationId anchors activationStart and firstContentfulPaint. Phase durations are clipped to that interval; nested CPU totals are not presented as additive wall time.",
    traceIntegrity: "Each raw trace byte length and SHA-256 is rechecked before analysis.",
  },
  comparisons,
  measurements,
  traceAttribution,
  traces: traceRuns,
  limitations: [
    "A smaller resource and smaller decoder task are causal consequences of source selection; click-to-FCP remains a noisy lab metric and is claimed only when both untraced profiles agree directionally.",
    "Image decoding runs on a worker and can overlap raster/compositor work, so its duration must not be subtracted directly from click-to-FCP.",
    "Chrome startup tracing records detailed browser internals but can perturb scheduling; paired untraced rows quantify that observer effect.",
    "Raw trace files stay in the configured temporary directory; this committed analysis retains their paths, byte lengths, hashes, event counts, and extracted evidence.",
    "The result covers the sampled mobile DPR-2 viewport and isolated article fixture, not every route, viewport, or field Core Web Vital.",
  ],
};

const outputPath = path.resolve(fixtureRoot, "results", outputName);
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(comparisons);
console.table(
  traceAttribution.map((row) => ({
    profile: row.profile,
    policy: row.avatarSizePolicy,
    "activation→FCP": row.activationToFcpMs.median,
    commit: row.browserCommitMs.median,
    "main frame": row.beginMainFrameMs.median,
    style: row.styleMs.median,
    layout: row.layoutMs.median,
    paint: row.paintMs.median,
    "raster wall": row.rasterWallMs.median,
    "decode max": row.imageDecodeMaxMs.median,
    "candidate px": row.selectedWidth.median,
  }))
);
console.log(`${output.decision}; wrote ${outputPath}`);
