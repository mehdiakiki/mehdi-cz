import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { renderContentDocument } from "./lib/render-document.mjs";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv.slice(2);
const inputPaths = (
  requested.length
    ? requested
    : ["results/perf036-controlled-navigation.json", "results/perf036-constrained-navigation.json"]
).map((inputPath) => path.resolve(fixtureRoot, inputPath));
const prefixSizes = [1024, 2048, 4096, 8192];
const fcpToleranceMs = 20;
const expectedArticleBodyBytes = 16_753;
const expectedTargetBodyBytes = 27_659;
const expectedTargetRequests = 10;

const dependencyMatchers = {
  heroImage: (request) => request.url.startsWith("/_next/image?"),
  font: (request) => request.url.split("?")[0].endsWith(".woff2"),
  sharedStylesheet: (request) => request.url.startsWith("/generated/shared/base.css"),
  articleStylesheet: (request) => request.url.startsWith("/generated/pruned/article.css"),
  bootstrapModule: (request) => request.url.startsWith("/hybrid/bootstrap.js"),
  prerenderModule: (request) => request.url.startsWith("/hybrid/prerender.js"),
  measurementModule: (request) => request.url.startsWith("/hybrid/navigation-measurement.js"),
};

const documentMarkers = {
  heroImage: "/_next/image?",
  font: ".woff2",
  sharedStylesheet: 'href="/generated/shared/base.css"',
  articleStylesheet: 'href="/generated/pruned/article.css"',
  bootstrapModule: 'src="/hybrid/bootstrap.js"',
  prerenderModule: 'src="/hybrid/prerender.js"',
  measurementModule: 'src="/hybrid/navigation-measurement.js"',
  headClosed: "</head>",
  bodyStarted: "<body",
};

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distribution(values) {
  const finite = values.filter(Number.isFinite);
  return {
    median: finite.length ? round(median(finite)) : null,
    min: finite.length ? round(Math.min(...finite)) : null,
    max: finite.length ? round(Math.max(...finite)) : null,
  };
}

function candidateKey(run) {
  return run.articleDeliveryMode === "prefix"
    ? `prefix-${run.articleEarlyPrefixBytes}`
    : run.articleDeliveryMode;
}

function articleRequest(run) {
  return run.transport.requests.find(
    (request) => request.phase === "target" && /\/article(?:\?|$)/.test(request.url)
  );
}

function targetDependency(run, matcher) {
  return run.transport.requests.find((request) => request.phase === "target" && matcher(request));
}

function leadBeforeArticleCompletion(run, matcher) {
  const article = articleRequest(run);
  const dependency = targetDependency(run, matcher);
  return article?.finishedAt && dependency?.requestedAt
    ? article.finishedAt - dependency.requestedAt
    : null;
}

function firstSubresourceLead(run) {
  const article = articleRequest(run);
  if (!article?.finishedAt) return null;
  const dependency = run.transport.requests
    .filter(
      (request) =>
        request.phase === "target" &&
        request.id !== article.id &&
        Number.isFinite(request.requestedAt)
    )
    .sort((left, right) => left.requestedAt - right.requestedAt)[0];
  return dependency ? article.finishedAt - dependency.requestedAt : null;
}

function summarizeCandidate(runs) {
  const dependencies = Object.fromEntries(
    Object.entries(dependencyMatchers).map(([name, matcher]) => [
      name,
      distribution(runs.map((run) => leadBeforeArticleCompletion(run, matcher))),
    ])
  );
  return {
    runs: runs.length,
    activations: runs.filter((run) => run.activationStart > 0).length,
    earlyCompressedPrefixBytes: [...new Set(runs.map((run) => run.articleEarlyPrefixBytes))],
    clickToFirstContentfulPaintMs: distribution(runs.map((run) => run.clickToFirstContentfulPaint)),
    articleRequestToHeadersMs: distribution(
      runs.map((run) => articleRequest(run)?.requestToHeadersMs)
    ),
    articleFirstBodyMs: distribution(runs.map((run) => articleRequest(run)?.firstBodyMs)),
    articleDurationMs: distribution(runs.map((run) => articleRequest(run)?.durationMs)),
    firstSubresourceLeadBeforeArticleCompletionMs: distribution(runs.map(firstSubresourceLead)),
    dependencyLeadBeforeArticleCompletionMs: dependencies,
    articleBodyBytes: [...new Set(runs.map((run) => articleRequest(run)?.sentBodyBytes))],
    targetBodyBytes: [...new Set(runs.map((run) => run.transport.target.sentBodyBytes))],
    targetRequests: [...new Set(runs.map((run) => run.transport.target.requests))],
  };
}

function decodePrefixMap() {
  const html = renderContentDocument("article", "prerender-dwell", { measure: true });
  const compressed = zlib.gzipSync(Buffer.from(html), { level: 9 });
  const prefixes = Object.fromEntries(
    prefixSizes.map((prefixBytes) => {
      const decoded = zlib
        .gunzipSync(compressed.subarray(0, prefixBytes), {
          finishFlush: zlib.constants.Z_SYNC_FLUSH,
        })
        .toString();
      return [
        prefixBytes,
        {
          decodedUtf8Bytes: Buffer.byteLength(decoded),
          decodedCharacters: decoded.length,
          markers: Object.fromEntries(
            Object.entries(documentMarkers).map(([name, marker]) => [
              name,
              decoded.includes(marker),
            ])
          ),
        },
      ];
    })
  );
  return {
    fullCompressedBytes: compressed.length,
    fullDecodedUtf8Bytes: Buffer.byteLength(html),
    prefixes,
  };
}

function analyzeArtifact(artifact, inputPath) {
  const groups = new Map();
  for (const run of artifact.rawRuns) {
    if (!run.transport?.requests) {
      throw new Error(`${inputPath} does not retain request details`);
    }
    const key = candidateKey(run);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const candidates = Object.fromEntries(
    [...groups].map(([key, runs]) => [key, summarizeCandidate(runs)])
  );
  for (const required of ["burst", ...prefixSizes.map((size) => `prefix-${size}`), "progressive"]) {
    if (!candidates[required]) throw new Error(`${inputPath} is missing ${required}`);
  }

  const progressiveFcp = candidates.progressive.clickToFirstContentfulPaintMs.median;
  const burstFcp = candidates.burst.clickToFirstContentfulPaintMs.median;
  const availableGain = burstFcp - progressiveFcp;
  const prefixAssessment = Object.fromEntries(
    prefixSizes.map((prefixBytes) => {
      const candidate = candidates[`prefix-${prefixBytes}`];
      const fcp = candidate.clickToFirstContentfulPaintMs.median;
      const delta = fcp - progressiveFcp;
      return [
        prefixBytes,
        {
          medianFcpDeltaFromProgressiveMs: round(delta),
          recoveredBurstToProgressiveGainPercent: round(((burstFcp - fcp) / availableGain) * 100),
          withinProgressiveTolerance: delta <= fcpToleranceMs,
          everyRunStartedSubresourcesBeforeArticleCompletion:
            candidate.firstSubresourceLeadBeforeArticleCompletionMs.min > 0,
          qualifies:
            delta <= fcpToleranceMs &&
            candidate.firstSubresourceLeadBeforeArticleCompletionMs.min > 0,
        },
      ];
    })
  );
  const smallestQualifyingPrefixBytes =
    prefixSizes.find((prefixBytes) => prefixAssessment[prefixBytes].qualifies) ?? null;
  const dependencyThresholds = Object.fromEntries(
    Object.keys(dependencyMatchers).map((name) => [
      name,
      prefixSizes.find(
        (prefixBytes) =>
          candidates[`prefix-${prefixBytes}`].dependencyLeadBeforeArticleCompletionMs[name].min > 0
      ) ?? null,
    ])
  );
  const allRuns = [...groups.values()].flat();
  const articleDurations = allRuns.map((run) => articleRequest(run)?.durationMs);
  const articleHeaders = allRuns.map((run) => articleRequest(run)?.requestToHeadersMs);
  const uniqueArticleBytes = [...new Set(allRuns.map((run) => articleRequest(run)?.sentBodyBytes))];
  const uniqueTargetBytes = [...new Set(allRuns.map((run) => run.transport.target.sentBodyBytes))];
  const uniqueTargetRequests = [...new Set(allRuns.map((run) => run.transport.target.requests))];

  return {
    source: path.relative(fixtureRoot, inputPath),
    profile: artifact.profile.transport,
    hoverDurations: artifact.profile.hoverDurations,
    candidates,
    contrasts: {
      burstToProgressiveGainMs: round(availableGain),
      prefixAssessment,
      smallestQualifyingPrefixBytes,
      dependencyThresholds,
    },
    acceptance: {
      fiveRunsPerCandidate: [...groups.values()].every((runs) => runs.length === 5),
      allRunsActivated: allRuns.every((run) => run.activationStart > 0),
      allArticleRequestsCompleted: allRuns.every((run) => articleRequest(run)?.completed),
      exactEarlyPrefixDelivery: allRuns.every((run) => {
        const article = articleRequest(run);
        return run.articleDeliveryMode === "prefix"
          ? article?.actualEarlyPrefixBytes === run.articleEarlyPrefixBytes
          : article?.actualEarlyPrefixBytes === 0;
      }),
      exactArticleBodyBytes:
        uniqueArticleBytes.length === 1 && uniqueArticleBytes[0] === expectedArticleBodyBytes,
      exactTargetBodyBytes:
        uniqueTargetBytes.length === 1 && uniqueTargetBytes[0] === expectedTargetBodyBytes,
      exactTargetRequestCount:
        uniqueTargetRequests.length === 1 && uniqueTargetRequests[0] === expectedTargetRequests,
      articleDurationSpreadMs: round(Math.max(...articleDurations) - Math.min(...articleDurations)),
      articleHeaderSpreadMs: round(Math.max(...articleHeaders) - Math.min(...articleHeaders)),
      articleBodyBytes: uniqueArticleBytes,
      targetBodyBytes: uniqueTargetBytes,
      targetRequests: uniqueTargetRequests,
    },
  };
}

const profiles = inputPaths.map((inputPath) =>
  analyzeArtifact(JSON.parse(fs.readFileSync(inputPath, "utf8")), inputPath)
);
const prefixMap = decodePrefixMap();
const acceptedProfiles = profiles.every(
  (profile) =>
    profile.acceptance.fiveRunsPerCandidate &&
    profile.acceptance.allRunsActivated &&
    profile.acceptance.allArticleRequestsCompleted &&
    profile.acceptance.exactEarlyPrefixDelivery &&
    profile.acceptance.exactArticleBodyBytes &&
    profile.acceptance.exactTargetBodyBytes &&
    profile.acceptance.exactTargetRequestCount &&
    profile.acceptance.articleDurationSpreadMs <= 5 &&
    profile.acceptance.articleHeaderSpreadMs <= 5
);
const smallestCrossProfilePrefixBytes =
  prefixSizes.find((prefixBytes) =>
    profiles.every((profile) => profile.contrasts.prefixAssessment[prefixBytes].qualifies)
  ) ?? null;
const output = {
  generatedAt: new Date().toISOString(),
  hypothesis:
    "A bounded early compressed document prefix can expose enough head markup for speculative parsing to recover progressive prerender activation without continuously streaming the entire article.",
  contract: {
    prefixSizes,
    fcpToleranceFromFullProgressiveMs: fcpToleranceMs,
    requiresEveryRunToStartASubresourceBeforeArticleCompletion: true,
    expectedArticleBodyBytes,
    expectedTargetBodyBytes,
    expectedTargetRequests,
    maximumArticleHeaderAndDurationSpreadMs: 5,
  },
  compressedPrefixMap: prefixMap,
  profiles,
  recommendation: {
    smallestCrossProfilePrefixBytes,
    compressedArticlePercent:
      smallestCrossProfilePrefixBytes === null
        ? null
        : round((smallestCrossProfilePrefixBytes / prefixMap.fullCompressedBytes) * 100),
  },
  decision:
    acceptedProfiles && smallestCrossProfilePrefixBytes !== null
      ? `supports-${smallestCrossProfilePrefixBytes}-byte-early-prefix`
      : "inconclusive",
};

const outputPath = path.join(fixtureRoot, "results/perf036-analysis.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(
  profiles.flatMap((profile) =>
    ["burst", ...prefixSizes.map((size) => `prefix-${size}`), "progressive"].map((key) => ({
      profile: profile.profile.name,
      candidate: key,
      "median FCP": profile.candidates[key].clickToFirstContentfulPaintMs.median,
      "vs progressive": key.startsWith("prefix-")
        ? profile.contrasts.prefixAssessment[key.slice("prefix-".length)]
            .medianFcpDeltaFromProgressiveMs
        : null,
      "first resource lead":
        profile.candidates[key].firstSubresourceLeadBeforeArticleCompletionMs.median,
    }))
  )
);
console.log(`${output.decision}: wrote ${outputPath}`);
