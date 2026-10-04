import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { headOrders, renderContentDocument } from "./lib/render-document.mjs";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv.slice(2);
const inputPaths = (
  requested.length
    ? requested
    : ["results/perf037-controlled-navigation.json", "results/perf037-constrained-navigation.json"]
).map((inputPath) => path.resolve(fixtureRoot, inputPath));
const visualPath = path.join(fixtureRoot, "results/perf037-visual-parity.json");
const cacheProbePath = path.join(fixtureRoot, "results/perf037-cache-clue.json");
const fcpToleranceMs = 20;
const maximumCompressedByteSpread = 128;
const expectedDecodedArticleBytes = 69_954;
const expectedTargetRequests = 10;
const requiredCandidates = [
  "original-prefix-1024",
  "css-first-prefix-1024",
  "resources-first-prefix-1024",
  "original-prefix-2048",
  "original-progressive",
];

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

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function candidateKey(run) {
  return run.articleDeliveryMode === "progressive"
    ? `${run.articleHeadOrder}-progressive`
    : `${run.articleHeadOrder}-prefix-${run.articleEarlyPrefixBytes}`;
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
  const revalidationUrls = [
    ...new Set(
      runs.flatMap((run) =>
        run.transport.requests
          .filter((request) => request.phase === "target" && request.status === 304)
          .map((request) => request.url.split("?")[0])
      )
    ),
  ].sort();
  return {
    runs: runs.length,
    activations: runs.filter((run) => run.activationStart > 0).length,
    articleHeadOrder: [...new Set(runs.map((run) => run.articleHeadOrder))],
    earlyCompressedPrefixBytes: [...new Set(runs.map((run) => run.articleEarlyPrefixBytes))],
    clickToFirstContentfulPaintMs: distribution(runs.map((run) => run.clickToFirstContentfulPaint)),
    articleRequestToHeadersMs: distribution(
      runs.map((run) => articleRequest(run)?.requestToHeadersMs)
    ),
    articleFirstBodyMs: distribution(runs.map((run) => articleRequest(run)?.firstBodyMs)),
    articleDurationMs: distribution(runs.map((run) => articleRequest(run)?.durationMs)),
    firstSubresourceLeadBeforeArticleCompletionMs: distribution(runs.map(firstSubresourceLead)),
    dependencyLeadBeforeArticleCompletionMs: Object.fromEntries(
      Object.entries(dependencyMatchers).map(([name, matcher]) => [
        name,
        distribution(runs.map((run) => leadBeforeArticleCompletion(run, matcher))),
      ])
    ),
    revalidationRequests: distribution(
      runs.map(
        (run) =>
          run.transport.requests.filter(
            (request) => request.phase === "target" && request.status === 304
          ).length
      )
    ),
    revalidationUrls,
    articleBodyBytes: [...new Set(runs.map((run) => articleRequest(run)?.sentBodyBytes))],
    targetBodyBytes: [...new Set(runs.map((run) => run.transport.target.sentBodyBytes))],
    targetRequests: [...new Set(runs.map((run) => run.transport.target.requests))],
  };
}

function rendererAnalysis() {
  const rows = Object.fromEntries(
    headOrders.map((headOrder) => {
      const html = renderContentDocument("article", "prerender-dwell", {
        measure: true,
        headOrder,
      });
      const compressed = zlib.gzipSync(Buffer.from(html), { level: 9 });
      const decodedPrefix = zlib
        .gunzipSync(compressed.subarray(0, 1024), {
          finishFlush: zlib.constants.Z_SYNC_FLUSH,
        })
        .toString();
      const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1] ?? "";
      const body = html.slice(html.indexOf("<body"));
      return [
        headOrder,
        {
          decodedArticleBytes: Buffer.byteLength(html),
          compressedArticleBytes: compressed.length,
          bodySha256: hash(body),
          sortedHeadTokenSha256: hash(JSON.stringify(head.match(/<[^>]*>|[^<]+/g)?.sort() ?? [])),
          prefix1024: {
            decodedUtf8Bytes: Buffer.byteLength(decodedPrefix),
            markers: Object.fromEntries(
              Object.entries(documentMarkers).map(([name, marker]) => [
                name,
                decodedPrefix.includes(marker),
              ])
            ),
          },
        },
      ];
    })
  );
  const decodedBytes = Object.values(rows).map((row) => row.decodedArticleBytes);
  const compressedBytes = Object.values(rows).map((row) => row.compressedArticleBytes);
  return {
    rows,
    acceptance: {
      exactDecodedArticleBytes:
        new Set(decodedBytes).size === 1 && decodedBytes[0] === expectedDecodedArticleBytes,
      identicalBodies: new Set(Object.values(rows).map((row) => row.bodySha256)).size === 1,
      identicalHeadTokenMultisets:
        new Set(Object.values(rows).map((row) => row.sortedHeadTokenSha256)).size === 1,
      compressedArticleByteSpread: Math.max(...compressedBytes) - Math.min(...compressedBytes),
      compressedArticleByteSpreadWithinLimit:
        Math.max(...compressedBytes) - Math.min(...compressedBytes) <= maximumCompressedByteSpread,
    },
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
  for (const required of requiredCandidates) {
    if (!candidates[required]) throw new Error(`${inputPath} is missing ${required}`);
  }

  const progressiveFcp = candidates["original-progressive"].clickToFirstContentfulPaintMs.median;
  const original1024Fcp = candidates["original-prefix-1024"].clickToFirstContentfulPaintMs.median;
  const original2048Fcp = candidates["original-prefix-2048"].clickToFirstContentfulPaintMs.median;
  const orderingAssessment = Object.fromEntries(
    ["css-first", "resources-first"].map((headOrder) => {
      const candidate = candidates[`${headOrder}-prefix-1024`];
      const fcp = candidate.clickToFirstContentfulPaintMs.median;
      const deltaFromProgressive = fcp - progressiveFcp;
      return [
        headOrder,
        {
          medianFcpImprovementFromOriginal1024Ms: round(original1024Fcp - fcp),
          medianFcpDeltaFromOriginal2048Ms: round(fcp - original2048Fcp),
          medianFcpDeltaFromProgressiveMs: round(deltaFromProgressive),
          withinProgressiveTolerance: deltaFromProgressive <= fcpToleranceMs,
          everyRunStartedSharedStylesheetBeforeArticleCompletion:
            candidate.dependencyLeadBeforeArticleCompletionMs.sharedStylesheet.min > 0,
          qualifies:
            deltaFromProgressive <= fcpToleranceMs &&
            candidate.dependencyLeadBeforeArticleCompletionMs.sharedStylesheet.min > 0,
        },
      ];
    })
  );
  const allRuns = [...groups.values()].flat();
  const articleDurations = allRuns.map((run) => articleRequest(run)?.durationMs);
  const articleHeaders = allRuns.map((run) => articleRequest(run)?.requestToHeadersMs);
  const articleBytes = allRuns.map((run) => articleRequest(run)?.sentBodyBytes);
  const targetBytes = allRuns.map((run) => run.transport.target.sentBodyBytes);
  const targetRequests = [...new Set(allRuns.map((run) => run.transport.target.requests))];

  return {
    source: path.relative(fixtureRoot, inputPath),
    profile: artifact.profile.transport,
    hoverDurations: artifact.profile.hoverDurations,
    candidates,
    contrasts: {
      orderingAssessment,
      original1024DeltaFromProgressiveMs: round(original1024Fcp - progressiveFcp),
      original2048DeltaFromProgressiveMs: round(original2048Fcp - progressiveFcp),
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
      exactTargetRequestCount:
        targetRequests.length === 1 && targetRequests[0] === expectedTargetRequests,
      articleBodyByteSpread: Math.max(...articleBytes) - Math.min(...articleBytes),
      articleBodyByteSpreadWithinLimit:
        Math.max(...articleBytes) - Math.min(...articleBytes) <= maximumCompressedByteSpread,
      targetBodyByteSpread: Math.max(...targetBytes) - Math.min(...targetBytes),
      targetBodyByteSpreadWithinLimit:
        Math.max(...targetBytes) - Math.min(...targetBytes) <= maximumCompressedByteSpread,
      articleDurationSpreadMs: round(Math.max(...articleDurations) - Math.min(...articleDurations)),
      articleHeaderSpreadMs: round(Math.max(...articleHeaders) - Math.min(...articleHeaders)),
      targetRequests,
    },
  };
}

const profiles = inputPaths.map((inputPath) =>
  analyzeArtifact(JSON.parse(fs.readFileSync(inputPath, "utf8")), inputPath)
);
const renderer = rendererAnalysis();
const visual = JSON.parse(fs.readFileSync(visualPath, "utf8"));
const cacheProbe = JSON.parse(fs.readFileSync(cacheProbePath, "utf8"));
const visualParity = visual.comparisons.every(
  (comparison) =>
    comparison.affectedPixels === 0 &&
    comparison.bodyMatches &&
    comparison.headTokenMultisetMatches &&
    comparison.metadataMatches
);
const acceptedProfiles = profiles.every(
  (profile) =>
    profile.acceptance.fiveRunsPerCandidate &&
    profile.acceptance.allRunsActivated &&
    profile.acceptance.allArticleRequestsCompleted &&
    profile.acceptance.exactEarlyPrefixDelivery &&
    profile.acceptance.exactTargetRequestCount &&
    profile.acceptance.articleBodyByteSpreadWithinLimit &&
    profile.acceptance.targetBodyByteSpreadWithinLimit &&
    profile.acceptance.articleDurationSpreadMs <= 5 &&
    profile.acceptance.articleHeaderSpreadMs <= 5
);
const acceptedRenderer = Object.entries(renderer.acceptance)
  .filter(([name]) => name !== "compressedArticleByteSpread")
  .every(([, value]) => value === true);
const qualifyingHeadOrders = ["css-first", "resources-first"].filter((headOrder) =>
  profiles.every((profile) => profile.contrasts.orderingAssessment[headOrder].qualifies)
);
const preferredHeadOrder = qualifyingHeadOrders.includes("css-first")
  ? "css-first"
  : (qualifyingHeadOrders[0] ?? null);
const revalidationUrls = [
  ...new Set(
    profiles.flatMap((profile) =>
      Object.values(profile.candidates).flatMap((candidate) => candidate.revalidationUrls)
    )
  ),
].sort();
const output = {
  generatedAt: new Date().toISOString(),
  hypothesis:
    "Moving existing critical stylesheet tags ahead of long metadata will let a 1 KiB compressed prefix reproduce the original 2 KiB/full-progressive prerender result without changing decoded content.",
  contract: {
    fcpToleranceFromOriginalProgressiveMs: fcpToleranceMs,
    maximumCompressedArticleAndTargetByteSpread: maximumCompressedByteSpread,
    maximumArticleHeaderAndDurationSpreadMs: 5,
    requiresEveryRunToStartSharedStylesheetBeforeArticleCompletion: true,
    expectedDecodedArticleBytes,
    expectedTargetRequests,
  },
  renderer,
  visual: {
    source: path.relative(fixtureRoot, visualPath),
    parity: visualParity,
    comparisons: visual.comparisons,
  },
  profiles,
  recommendation: {
    preferredHeadOrder,
    qualifyingHeadOrders,
    earlyCompressedPrefixBytes: preferredHeadOrder ? 1024 : null,
    rationale:
      preferredHeadOrder === "css-first"
        ? "CSS-first qualifies in both profiles while moving fewer token categories than resources-first."
        : "No CSS-only ordering passed both profiles.",
  },
  nextInvestigation: {
    id: "PERF-038",
    subject: "shared-resource cache freshness during speculative navigation",
    observedRevalidationUrls: revalidationUrls,
    cacheProbe: {
      source: path.relative(fixtureRoot, cacheProbePath),
      summary: cacheProbe.summary,
      policies: cacheProbe.resources.map((resource) => ({
        path: resource.path,
        cacheControl: resource.cacheControl,
        conditionalStatus: resource.conditionalStatus,
      })),
    },
    observation:
      "Every candidate issues five zero-body 304 validations for resources already requested by the source document; all five fixture responses use public, max-age=0 and validate to 304. Test content-addressed immutable caching before optimizing later head tokens.",
  },
  decision:
    acceptedProfiles && acceptedRenderer && visualParity && preferredHeadOrder === "css-first"
      ? "supports-css-first-1024-byte-head-capsule"
      : "inconclusive",
};

const outputPath = path.join(fixtureRoot, "results/perf037-analysis.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(
  profiles.flatMap((profile) =>
    requiredCandidates.map((key) => ({
      profile: profile.profile.name,
      candidate: key,
      "median FCP": profile.candidates[key].clickToFirstContentfulPaintMs.median,
      "shared CSS lead":
        profile.candidates[key].dependencyLeadBeforeArticleCompletionMs.sharedStylesheet.median,
      revalidations: profile.candidates[key].revalidationRequests.median,
    }))
  )
);
console.log(`${output.decision}: wrote ${outputPath}`);
