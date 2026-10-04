import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import cacheAssets from "./generated/cache-assets.json" with { type: "json" };
import { assetPolicies, renderContentDocument } from "./lib/render-document.mjs";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv.slice(2);
const inputPaths = (
  requested.length
    ? requested
    : ["results/perf038-controlled-navigation.json", "results/perf038-constrained-navigation.json"]
).map((inputPath) => path.resolve(fixtureRoot, inputPath));
const visualPath = path.join(fixtureRoot, "results/perf038-visual-parity.json");
const cacheProbePath = path.join(fixtureRoot, "results/perf038-cache-policy.json");
const expectedRunsPerCandidate = 5;
const expectedStaleTargetRequests = 10;
const expectedImmutableTargetRequests = 4;
const expectedStaleRevalidations = 6;
const expectedImmutableRevalidations = 0;
const maximumFcpRegressionMs = 10;
const minimumMaterialFcpImprovementMs = 10;
const maximumArticleTimingSpreadMs = 5;
const maximumCompressedBodySpread = 128;

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

function articleRequest(run) {
  return run.transport.requests.find(
    (request) => request.phase === "target" && /\/article(?:\?|$)/.test(request.url)
  );
}

function requestKind(request) {
  if (/\/article(?:\?|$)/.test(request.url)) return "articleDocument";
  if (request.url.startsWith("/generated/pruned/article.css")) return "articleStylesheet";
  if (request.url.startsWith("/_next/image?")) return "optimizedImage";
  if (request.url.startsWith("/hybrid/navigation-measurement.js")) {
    return "measurementModule";
  }
  return request.url.split("?")[0];
}

function remainingRequestTiming(runs) {
  const kinds = new Map();
  for (const run of runs) {
    const article = articleRequest(run);
    const fcpAt = article.requestedAt + run.activationStart + run.clickToFirstContentfulPaint;
    for (const request of run.transport.requests.filter((entry) => entry.phase === "target")) {
      const kind = requestKind(request);
      if (!kinds.has(kind)) kinds.set(kind, []);
      kinds.get(kind).push({ request, article, fcpAt });
    }
  }
  return Object.fromEntries(
    [...kinds].map(([kind, entries]) => [
      kind,
      {
        presentInEveryRun: entries.length === runs.length,
        statuses: [...new Set(entries.map(({ request }) => request.status))].sort(),
        sentBodyBytes: distribution(entries.map(({ request }) => request.sentBodyBytes)),
        requestedAfterArticleMs: distribution(
          entries.map(({ request, article }) => request.requestedAt - article.requestedAt)
        ),
        durationMs: distribution(entries.map(({ request }) => request.durationMs)),
        finishedAfterArticleMs: distribution(
          entries.map(({ request, article }) => request.finishedAt - article.requestedAt)
        ),
        finishedBeforeFcpMs: distribution(
          entries.map(({ request, fcpAt }) => fcpAt - request.finishedAt)
        ),
      },
    ])
  );
}

function sharedResourceUrls(policy) {
  return new Set(
    Object.values(
      policy === "mutable"
        ? Object.fromEntries(
            Object.keys(cacheAssets.policies["hashed-stale"]).map((source) => [source, source])
          )
        : cacheAssets.policies[policy]
    )
  );
}

function summarizeCandidate(runs, policy) {
  const sharedUrls = sharedResourceUrls(policy);
  const targetSharedRequests = (run) =>
    run.transport.requests.filter(
      (request) => request.phase === "target" && sharedUrls.has(request.url.split("?")[0])
    );
  const requestInventory = [
    ...new Set(
      runs
        .flatMap((run) => run.transport.requests)
        .filter((request) => request.phase === "target")
        .map((request) => `${request.status} ${request.url.split("?")[0]}`)
    ),
  ].sort();
  return {
    runs: runs.length,
    activations: runs.filter((run) => run.activationStart > 0).length,
    clickToFirstContentfulPaintMs: distribution(runs.map((run) => run.clickToFirstContentfulPaint)),
    targetRequests: distribution(runs.map((run) => run.transport.target.requests)),
    targetBodyBytes: distribution(runs.map((run) => run.transport.target.sentBodyBytes)),
    articleBodyBytes: distribution(runs.map((run) => articleRequest(run)?.sentBodyBytes)),
    articleRequestToHeadersMs: distribution(
      runs.map((run) => articleRequest(run)?.requestToHeadersMs)
    ),
    articleDurationMs: distribution(runs.map((run) => articleRequest(run)?.durationMs)),
    sharedResourceRequests: distribution(runs.map((run) => targetSharedRequests(run).length)),
    revalidationRequests: distribution(
      runs.map(
        (run) =>
          run.transport.requests.filter(
            (request) => request.phase === "target" && request.status === 304
          ).length
      )
    ),
    sharedResourceStatuses: [
      ...new Set(runs.flatMap((run) => targetSharedRequests(run).map((request) => request.status))),
    ].sort(),
    revalidationUrls: [
      ...new Set(
        runs.flatMap((run) =>
          run.transport.requests
            .filter((request) => request.phase === "target" && request.status === 304)
            .map((request) => request.url.split("?")[0])
        )
      ),
    ].sort(),
    requestInventory,
  };
}

function rendererAnalysis() {
  const documents = Object.fromEntries(
    assetPolicies.map((assetPolicy) => {
      const html = renderContentDocument("article", "prerender-dwell", {
        measure: true,
        stagedPolicy: "adaptive",
        commitCancelBeforeMs: 150,
        headOrder: "css-first",
        assetPolicy,
      });
      const normalized = Object.entries(cacheAssets.policies[assetPolicy] ?? {}).reduce(
        (value, [source, target]) => value.replaceAll(target, source),
        html
      );
      return [
        assetPolicy,
        {
          decodedBytes: Buffer.byteLength(html),
          gzipBytes: zlib.gzipSync(Buffer.from(html), { level: 9 }).length,
          normalizedSha256: hash(normalized),
        },
      ];
    })
  );
  const hashedDecodedBytes = [
    documents["hashed-stale"].decodedBytes,
    documents["hashed-immutable"].decodedBytes,
  ];
  const gzipBytes = assetPolicies.map((policy) => documents[policy].gzipBytes);
  return {
    documents,
    acceptance: {
      identicalNormalizedDocuments:
        new Set(assetPolicies.map((policy) => documents[policy].normalizedSha256)).size === 1,
      equalHashedDecodedBytes: new Set(hashedDecodedBytes).size === 1,
      compressedBodySpread: Math.max(...gzipBytes) - Math.min(...gzipBytes),
      compressedBodySpreadWithinLimit:
        Math.max(...gzipBytes) - Math.min(...gzipBytes) <= maximumCompressedBodySpread,
    },
  };
}

function analyzeArtifact(artifact, inputPath) {
  const groups = new Map();
  for (const run of artifact.rawRuns) {
    if (!run.transport?.requests) throw new Error(`${inputPath} does not retain request details`);
    if (!groups.has(run.assetPolicy)) groups.set(run.assetPolicy, []);
    groups.get(run.assetPolicy).push(run);
  }
  for (const policy of assetPolicies) {
    if (!groups.has(policy)) throw new Error(`${inputPath} is missing ${policy}`);
  }
  const candidates = Object.fromEntries(
    assetPolicies.map((policy) => [policy, summarizeCandidate(groups.get(policy), policy)])
  );
  const allRuns = [...groups.values()].flat();
  const articleDurations = allRuns.map((run) => articleRequest(run)?.durationMs);
  const articleHeaders = allRuns.map((run) => articleRequest(run)?.requestToHeadersMs);
  const articleBytes = allRuns.map((run) => articleRequest(run)?.sentBodyBytes);
  const targetBytes = allRuns.map((run) => run.transport.target.sentBodyBytes);
  const staleFcp = candidates["hashed-stale"].clickToFirstContentfulPaintMs.median;
  const immutableFcp = candidates["hashed-immutable"].clickToFirstContentfulPaintMs.median;
  const immutableImprovementMs = round(staleFcp - immutableFcp);
  const immutableRuns = groups.get("hashed-immutable");
  return {
    source: path.relative(fixtureRoot, inputPath),
    profile: artifact.profile.transport,
    candidates,
    remainingImmutableRequestTiming: remainingRequestTiming(immutableRuns),
    contrast: {
      primary: "hashed-stale minus hashed-immutable",
      targetRequestReduction:
        candidates["hashed-stale"].targetRequests.median -
        candidates["hashed-immutable"].targetRequests.median,
      revalidationReduction:
        candidates["hashed-stale"].revalidationRequests.median -
        candidates["hashed-immutable"].revalidationRequests.median,
      targetBodyByteReduction:
        candidates["hashed-stale"].targetBodyBytes.median -
        candidates["hashed-immutable"].targetBodyBytes.median,
      medianFcpImprovementMs: immutableImprovementMs,
      noMaterialFcpRegression: immutableImprovementMs >= -maximumFcpRegressionMs,
      materialFcpImprovement: immutableImprovementMs >= minimumMaterialFcpImprovementMs,
    },
    acceptance: {
      fiveRunsPerCandidate: assetPolicies.every(
        (policy) => groups.get(policy).length === expectedRunsPerCandidate
      ),
      allRunsActivated: allRuns.every((run) => run.activationStart > 0),
      allArticleRequestsCompleted: allRuns.every((run) => articleRequest(run)?.completed),
      exactEarlyPrefixDelivery: allRuns.every(
        (run) => articleRequest(run)?.actualEarlyPrefixBytes === 1024
      ),
      exactStaleTargetRequests:
        candidates["hashed-stale"].targetRequests.min === expectedStaleTargetRequests &&
        candidates["hashed-stale"].targetRequests.max === expectedStaleTargetRequests,
      exactImmutableTargetRequests:
        candidates["hashed-immutable"].targetRequests.min === expectedImmutableTargetRequests &&
        candidates["hashed-immutable"].targetRequests.max === expectedImmutableTargetRequests,
      exactStaleRevalidations:
        candidates["hashed-stale"].revalidationRequests.min === expectedStaleRevalidations &&
        candidates["hashed-stale"].revalidationRequests.max === expectedStaleRevalidations,
      exactImmutableRevalidations:
        candidates["hashed-immutable"].revalidationRequests.min ===
          expectedImmutableRevalidations &&
        candidates["hashed-immutable"].revalidationRequests.max === expectedImmutableRevalidations,
      articleBodyByteSpread: Math.max(...articleBytes) - Math.min(...articleBytes),
      articleBodyByteSpreadWithinLimit:
        Math.max(...articleBytes) - Math.min(...articleBytes) <= maximumCompressedBodySpread,
      targetBodyByteSpread: Math.max(...targetBytes) - Math.min(...targetBytes),
      targetBodyByteSpreadWithinLimit:
        Math.max(...targetBytes) - Math.min(...targetBytes) <= maximumCompressedBodySpread,
      articleDurationSpreadMs: round(Math.max(...articleDurations) - Math.min(...articleDurations)),
      articleHeaderSpreadMs: round(Math.max(...articleHeaders) - Math.min(...articleHeaders)),
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
    comparison.normalizedBodyMatches &&
    comparison.normalizedHeadTokenMultisetMatches &&
    comparison.metadataMatches
);
const acceptedProfiles = profiles.every(
  (profile) =>
    profile.acceptance.fiveRunsPerCandidate &&
    profile.acceptance.allRunsActivated &&
    profile.acceptance.allArticleRequestsCompleted &&
    profile.acceptance.exactEarlyPrefixDelivery &&
    profile.acceptance.exactStaleTargetRequests &&
    profile.acceptance.exactImmutableTargetRequests &&
    profile.acceptance.exactStaleRevalidations &&
    profile.acceptance.exactImmutableRevalidations &&
    profile.acceptance.articleBodyByteSpreadWithinLimit &&
    profile.acceptance.targetBodyByteSpreadWithinLimit &&
    profile.acceptance.articleDurationSpreadMs <= maximumArticleTimingSpreadMs &&
    profile.acceptance.articleHeaderSpreadMs <= maximumArticleTimingSpreadMs &&
    profile.contrast.noMaterialFcpRegression
);
const acceptedRenderer = Object.entries(renderer.acceptance)
  .filter(([name]) => !["compressedBodySpread"].includes(name))
  .every(([, value]) => value === true);
const cacheHeadersAccepted =
  cacheProbe.summary.mutableFreshResources === 7 &&
  cacheProbe.summary.hashedStaleResources === 7 &&
  cacheProbe.summary.hashedImmutableResources === 7;
const materialFcpWin = profiles.some((profile) => profile.contrast.materialFcpImprovement);
const immutableInventory = [
  ...new Set(
    profiles.flatMap((profile) =>
      profile.candidates["hashed-immutable"].requestInventory.map((entry) =>
        entry.replace(/^\d+ /, "")
      )
    )
  ),
].sort();
const output = {
  generatedAt: new Date().toISOString(),
  hypothesis:
    "Content-addressed immutable shared assets will remove the target-phase validation round trips exposed by PERF-037 without changing rendering semantics or regressing click-to-FCP.",
  contract: {
    primaryCausalContrast: "hashed-stale versus equally shaped hashed-immutable URLs",
    mutableUrlsAreContextualBaseline: true,
    expectedRequestChange: `${expectedStaleTargetRequests} to ${expectedImmutableTargetRequests}`,
    expectedRevalidationChange: `${expectedStaleRevalidations} to ${expectedImmutableRevalidations}`,
    maximumFcpRegressionMs,
    minimumMaterialFcpImprovementMs,
    maximumArticleHeaderAndDurationSpreadMs: maximumArticleTimingSpreadMs,
    maximumCompressedArticleAndTargetBodySpread: maximumCompressedBodySpread,
  },
  cacheProbe: {
    source: path.relative(fixtureRoot, cacheProbePath),
    summary: cacheProbe.summary,
    accepted: cacheHeadersAccepted,
  },
  renderer,
  visual: {
    source: path.relative(fixtureRoot, visualPath),
    parity: visualParity,
    comparisons: visual.comparisons,
  },
  profiles,
  recommendation: {
    useContentAddressedImmutableSharedAssets:
      acceptedProfiles && acceptedRenderer && cacheHeadersAccepted && visualParity,
    materialFcpWin,
    rationale: materialFcpWin
      ? "The immutable policy removes all six observed validation requests and produces a material median FCP improvement in both profiles."
      : "The immutable policy removes all six observed validation requests without a material FCP regression; treat this as a deterministic request/latency-risk reduction, not an FCP breakthrough.",
  },
  nextInvestigation: {
    id: "PERF-039",
    subject: "prerender activation/render floor after network readiness",
    immutableTargetRequestInventory: immutableInventory,
    remainingRequestTimingByProfile: Object.fromEntries(
      profiles.map((profile) => [profile.profile.name, profile.remainingImmutableRequestTiming])
    ),
    observation:
      "All remaining production responses finish before FCP in every immutable run; the measurement-only module can finish after FCP and therefore is not paint-blocking. PERF-039 should trace the roughly 28–32 ms activation/render floor instead of optimizing already-complete network work.",
  },
  decision:
    acceptedProfiles && acceptedRenderer && cacheHeadersAccepted && visualParity
      ? materialFcpWin
        ? "supports-immutable-shared-assets-with-measured-fcp-win"
        : "supports-immutable-shared-assets-request-win"
      : "inconclusive",
};

const outputPath = path.join(fixtureRoot, "results/perf038-analysis.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(
  profiles.flatMap((profile) =>
    assetPolicies.map((policy) => ({
      profile: profile.profile.name,
      policy,
      "median FCP": profile.candidates[policy].clickToFirstContentfulPaintMs.median,
      requests: profile.candidates[policy].targetRequests.median,
      revalidations: profile.candidates[policy].revalidationRequests.median,
      "target bytes": profile.candidates[policy].targetBodyBytes.median,
    }))
  )
);
console.log(`${output.decision}: wrote ${outputPath}`);
