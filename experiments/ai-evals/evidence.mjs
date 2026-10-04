// Build one evidence report per failure class for the invented triage feature.
//
//   node experiments/ai-evals/evidence.mjs
//
// Nothing is fetched. The dataset and the run are simulated with a seeded
// PRNG, so the printed numbers are stable across machines and reruns.

import {
  buildDataset,
  labelWithJudgeAndHumans,
  runVersion,
  USD_PER_MILLION_TOKENS,
} from "./triage-dataset.mjs";
import {
  cohenKappa,
  mcnemar,
  mean,
  pairedBootstrapInterval,
  percent,
  quantile,
  wilsonInterval,
} from "./stats.mjs";

const COST_BUDGET_USD = 0.02;
const LATENCY_BUDGET_MS = 3500;

export function buildEvidence() {
  const items = buildDataset();
  const records = runVersion(items, "v1");

  // --- Failure class 1: wrong answer -----------------------------------
  const correct = records.filter((r) => r.answerCorrect).length;
  const accuracy = correct / records.length;

  const sizes = [50, 100, 300];
  const intervals = sizes.map((n) => {
    const slice = records.slice(0, n);
    const hits = slice.filter((r) => r.answerCorrect).length;
    const interval = wilsonInterval(hits, n);
    return { n, accuracy: hits / n, ...interval };
  });

  // --- Failure class 2: unsafe tool action -----------------------------
  const unsafe = records.filter((r) => r.unsafeTrajectory);
  const unsafeHiddenBehindCorrect = records.filter(
    (r) => r.answerCorrect && r.unsafeTrajectory
  );
  const violationCounts = new Map();
  for (const record of records) {
    for (const violation of record.violations) {
      violationCounts.set(violation, (violationCounts.get(violation) ?? 0) + 1);
    }
  }

  // --- Failure class 3: missing or irrelevant retrieval ----------------
  const retrievalHits = records.filter((r) => r.retrievalHit);
  const recall = retrievalHits.length / records.length;
  const accuracyWithEvidence =
    retrievalHits.filter((r) => r.answerCorrect).length / retrievalHits.length;
  const misses = records.filter((r) => !r.retrievalHit);
  const accuracyWithoutEvidence = misses.filter((r) => r.answerCorrect).length / misses.length;

  // The naive split above is confounded: a hard item both loses retrieval and
  // gets answered badly. The oracle run forces the gold snippet into the same
  // items with the same draws, so the difference on the missed items is the
  // isolated generation effect rather than a difficulty effect.
  const oracle = runVersion(items, "v1", { oracleContext: true });
  const missedIds = new Set(misses.map((r) => r.id));
  const oracleOnMissed = oracle.filter((r) => missedIds.has(r.id));
  const oracleAccuracyOnMissed =
    oracleOnMissed.filter((r) => r.answerCorrect).length / oracleOnMissed.length;
  const oracleAccuracyAll = oracle.filter((r) => r.answerCorrect).length / oracle.length;

  // --- Failure class 4: cost and latency -------------------------------
  const costs = records.map((r) => r.costUsd);
  const latencies = records.map((r) => r.latencyMs);
  const overCost = costs.filter((c) => c > COST_BUDGET_USD).length;
  const overLatency = latencies.filter((l) => l > LATENCY_BUDGET_MS).length;

  // --- The judge that would grade class 1 at scale ---------------------
  const labels = labelWithJudgeAndHumans(records);
  const humanAgreement = cohenKappa(
    labels.map((l) => l.humanA),
    labels.map((l) => l.humanB)
  );
  const consensus = labels.filter((l) => l.humanA === l.humanB);
  const judgeAgreement = cohenKappa(
    consensus.map((l) => l.humanA),
    consensus.map((l) => l.judge)
  );

  // --- Failure class 5: silent regression after a change ---------------
  // The same 300 items are replayed through a second version, so the
  // comparison is paired -> item difficulty cancels out.
  const after = runVersion(items, "v2");
  const deltas = records.map((r, i) => (after[i].answerCorrect ? 1 : 0) - (r.answerCorrect ? 1 : 0));
  const pairedCi = pairedBootstrapInterval(deltas, { seed: 7, resamples: 4000 });
  let onlyBefore = 0;
  let onlyAfter = 0;
  for (let i = 0; i < records.length; i += 1) {
    if (records[i].answerCorrect && !after[i].answerCorrect) onlyBefore += 1;
    if (!records[i].answerCorrect && after[i].answerCorrect) onlyAfter += 1;
  }
  const test = mcnemar(onlyBefore, onlyAfter);

  return {
    total: records.length,
    accuracy,
    intervals,
    unsafeCount: unsafe.length,
    unsafeRate: unsafe.length / records.length,
    unsafeHiddenBehindCorrect: unsafeHiddenBehindCorrect.length,
    unsafeShareOfCorrect: unsafeHiddenBehindCorrect.length / correct,
    violationCounts: [...violationCounts.entries()].sort((a, b) => b[1] - a[1]),
    recall,
    accuracyWithEvidence,
    accuracyWithoutEvidence,
    missedCount: misses.length,
    oracleAccuracyOnMissed,
    oracleAccuracyAll,
    isolatedGenerationGain: oracleAccuracyOnMissed - accuracyWithoutEvidence,
    costMean: mean(costs),
    costP50: quantile(costs, 0.5),
    costP95: quantile(costs, 0.95),
    costMax: Math.max(...costs),
    costTotal: costs.reduce((a, b) => a + b, 0),
    overCost,
    latencyP50: quantile(latencies, 0.5),
    latencyP95: quantile(latencies, 0.95),
    overLatency,
    afterAccuracy: after.filter((r) => r.answerCorrect).length / after.length,
    pairedDelta: mean(deltas),
    pairedCiLow: pairedCi.low,
    pairedCiHigh: pairedCi.high,
    onlyBefore,
    onlyAfter,
    mcnemarP: test.p,
    humanKappa: humanAgreement.kappa,
    judgeKappa: judgeAgreement.kappa,
    judgeObserved: judgeAgreement.observed,
    consensusSize: consensus.length,
  };
}

function usd(value) {
  return `$${value.toFixed(4)}`;
}

function main() {
  const e = buildEvidence();

  console.log(`dataset: ${e.total} recorded triage items, blended price ` +
    `$${USD_PER_MILLION_TOKENS}/M tokens`);
  console.log("");

  console.log("[1] wrong answer");
  console.log(`  final answer accuracy: ${percent(e.accuracy)}`);
  for (const row of e.intervals) {
    console.log(
      `  n=${String(row.n).padStart(3)}  accuracy ${percent(row.accuracy)}  ` +
        `95% CI [${percent(row.low)}, ${percent(row.high)}]  ` +
        `width ${(row.width * 100).toFixed(1)} pts`
    );
  }
  console.log("");

  console.log("[2] unsafe or wrong tool action");
  console.log(`  runs with at least one trajectory violation: ${e.unsafeCount} ` +
    `(${percent(e.unsafeRate)})`);
  console.log(
    `  of those, hidden behind a correct final answer: ${e.unsafeHiddenBehindCorrect} ` +
      `(${percent(e.unsafeShareOfCorrect)} of all correct answers)`
  );
  for (const [name, count] of e.violationCounts) {
    console.log(`    ${name}: ${count}`);
  }
  console.log("");

  console.log("[3] missing or irrelevant retrieval");
  console.log(`  gold policy retrieved: ${percent(e.recall)}`);
  console.log(`  answer accuracy with the gold snippet: ${percent(e.accuracyWithEvidence)}`);
  console.log(`  answer accuracy without it: ${percent(e.accuracyWithoutEvidence)}`);
  console.log(`  naive split (confounded by item difficulty): ` +
    `${((e.accuracyWithEvidence - e.accuracyWithoutEvidence) * 100).toFixed(1)} pts`);
  console.log(`  oracle context forced on the same 300 items: ${percent(e.oracleAccuracyAll)}`);
  console.log(
    `  on the ${e.missedCount} items retrieval missed: ` +
      `${percent(e.accuracyWithoutEvidence)} -> ${percent(e.oracleAccuracyOnMissed)} with the ` +
      `gold snippet (isolated generation effect ` +
      `${(e.isolatedGenerationGain * 100).toFixed(1)} pts)`
  );
  console.log("");

  console.log("[4] cost and latency");
  console.log(`  cost mean ${usd(e.costMean)}  p50 ${usd(e.costP50)}  ` +
    `p95 ${usd(e.costP95)}  max ${usd(e.costMax)}`);
  console.log(`  suite total: ${usd(e.costTotal)}`);
  console.log(`  runs above the ${usd(COST_BUDGET_USD)} budget: ${e.overCost}`);
  console.log(
    `  latency p50 ${Math.round(e.latencyP50)} ms  p95 ${Math.round(e.latencyP95)} ms  ` +
      `runs above ${LATENCY_BUDGET_MS} ms: ${e.overLatency}`
  );
  console.log("");

  console.log("[5] silent regression after a change");
  console.log(`  v1 accuracy ${percent(e.accuracy)} -> v2 accuracy ${percent(e.afterAccuracy)}`);
  console.log(
    `  paired delta ${(e.pairedDelta * 100).toFixed(1)} pts  ` +
      `95% CI [${(e.pairedCiLow * 100).toFixed(1)}, ${(e.pairedCiHigh * 100).toFixed(1)}] pts`
  );
  console.log(
    `  discordant items: ${e.onlyBefore} passed only on v1, ${e.onlyAfter} passed only on v2  ` +
      `McNemar p=${e.mcnemarP.toFixed(3)}`
  );
  console.log("");

  console.log("[grader] the judge that would score class 1 at scale");
  console.log(`  human vs human kappa: ${e.humanKappa.toFixed(2)}`);
  console.log(
    `  judge vs human consensus kappa: ${e.judgeKappa.toFixed(2)} ` +
      `on ${e.consensusSize} agreed items (raw agreement ${percent(e.judgeObserved)})`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
