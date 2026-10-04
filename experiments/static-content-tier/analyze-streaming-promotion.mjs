import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv.slice(2);
const inputPaths = (
  requested.length
    ? requested
    : ["results/perf035-controlled-navigation.json", "results/perf035-constrained-navigation.json"]
).map((inputPath) => path.resolve(fixtureRoot, inputPath));

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

function articleRequest(run) {
  return run.transport.requests.find(
    (request) => request.phase === "target" && /\/article(?:\?|$)/.test(request.url)
  );
}

function firstSubresourceLead(run) {
  const article = articleRequest(run);
  if (!article?.finishedAt) return null;
  const firstSubresource = run.transport.requests
    .filter(
      (request) =>
        request.phase === "target" &&
        request.id !== article.id &&
        Number.isFinite(request.requestedAt)
    )
    .sort((left, right) => left.requestedAt - right.requestedAt)[0];
  return firstSubresource ? article.finishedAt - firstSubresource.requestedAt : null;
}

function summarizeCandidate(runs) {
  return {
    runs: runs.length,
    activations: runs.filter((run) => run.activationStart > 0).length,
    clickToFirstContentfulPaint: distribution(runs.map((run) => run.clickToFirstContentfulPaint)),
    articleRequestToHeadersMs: distribution(
      runs.map((run) => articleRequest(run)?.requestToHeadersMs)
    ),
    articleFirstBodyMs: distribution(runs.map((run) => articleRequest(run)?.firstBodyMs)),
    articleDurationMs: distribution(runs.map((run) => articleRequest(run)?.durationMs)),
    firstSubresourceLeadBeforeArticleCompletionMs: distribution(runs.map(firstSubresourceLead)),
    articleBodyBytes: [...new Set(runs.map((run) => articleRequest(run)?.sentBodyBytes))],
    targetBodyBytes: [...new Set(runs.map((run) => run.transport.target.sentBodyBytes))],
    targetRequests: [...new Set(runs.map((run) => run.transport.target.requests))],
  };
}

function candidateKey(run) {
  const policy = run.promotionGate === "complete" ? "complete" : "eager";
  return `${policy}-${run.articleDeliveryMode}`;
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
  for (const required of [
    "eager-progressive",
    "complete-progressive",
    "eager-burst",
    "complete-burst",
  ]) {
    if (!candidates[required]) throw new Error(`${inputPath} is missing ${required}`);
  }

  const eagerProgressive = candidates["eager-progressive"].clickToFirstContentfulPaint.median;
  const completeProgressive = candidates["complete-progressive"].clickToFirstContentfulPaint.median;
  const eagerBurst = candidates["eager-burst"].clickToFirstContentfulPaint.median;
  const completeBurst = candidates["complete-burst"].clickToFirstContentfulPaint.median;
  const progressiveGatePenalty = completeProgressive - eagerProgressive;
  const burstGatePenalty = completeBurst - eagerBurst;
  const collapsedPenalty = progressiveGatePenalty - burstGatePenalty;
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
      progressiveGatePenaltyMs: round(progressiveGatePenalty),
      burstGatePenaltyMs: round(burstGatePenalty),
      collapsedPenaltyMs: round(collapsedPenalty),
      collapsedPenaltyPercent: round((collapsedPenalty / progressiveGatePenalty) * 100),
      progressiveBenefitWithEagerPromotionMs: round(eagerBurst - eagerProgressive),
      progressiveBenefitAfterCompletionMs: round(completeBurst - completeProgressive),
    },
    acceptance: {
      allRunsActivated: allRuns.every((run) => run.activationStart > 0),
      oneArticleByteCount: uniqueArticleBytes.length === 1,
      oneTargetByteCount: uniqueTargetBytes.length === 1,
      oneTargetRequestCount: uniqueTargetRequests.length === 1,
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
const output = {
  generatedAt: new Date().toISOString(),
  hypothesis:
    "If progressive document visibility explains PERF-034's eager-promotion advantage, withholding the same body until the matched completion point should collapse the eager-versus-complete gap.",
  profiles,
  decision: profiles.every(
    (profile) =>
      profile.acceptance.allRunsActivated &&
      profile.acceptance.oneArticleByteCount &&
      profile.acceptance.oneTargetByteCount &&
      profile.acceptance.oneTargetRequestCount &&
      profile.acceptance.articleDurationSpreadMs <= 5 &&
      profile.acceptance.articleHeaderSpreadMs <= 5 &&
      profile.contrasts.collapsedPenaltyPercent >= 75
  )
    ? "supports-progressive-processing"
    : "inconclusive",
};

const outputPath = path.join(fixtureRoot, "results/perf035-analysis.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(
  profiles.map((profile) => ({
    profile: profile.profile.name,
    "progressive gate penalty": profile.contrasts.progressiveGatePenaltyMs,
    "burst gate penalty": profile.contrasts.burstGatePenaltyMs,
    "penalty collapse": profile.contrasts.collapsedPenaltyMs,
    "collapse %": profile.contrasts.collapsedPenaltyPercent,
    "duration spread": profile.acceptance.articleDurationSpreadMs,
    "header spread": profile.acceptance.articleHeaderSpreadMs,
  }))
);
console.log(`${output.decision}: wrote ${outputPath}`);
