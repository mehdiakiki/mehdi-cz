// Pins every number the pillar article quotes.
//   node --test experiments/ai-evals/

import assert from "node:assert/strict";
import test from "node:test";

import { buildEvidence } from "./evidence.mjs";
import { buildDataset, runVersion } from "./triage-dataset.mjs";
import { cohenKappa, mcnemar, wilsonInterval } from "./stats.mjs";

const round = (value, digits) => Number(value.toFixed(digits));

test("the recorded dataset is stable", () => {
  const items = buildDataset();
  assert.equal(items.length, 300);
  assert.equal(items[0].id, "t-001");
  assert.equal(items.filter((item) => item.refundRequested).length, 96);
  assert.equal(new Set(items.map((item) => item.tenantId)).size, 40);
});

test("running the dataset twice gives identical records", () => {
  const items = buildDataset();
  assert.deepEqual(runVersion(items, "v1"), runVersion(items, "v1"));
});

test("class 1: accuracy and confidence interval width by sample size", () => {
  const e = buildEvidence();
  assert.equal(e.accuracy, 0.72);
  assert.deepEqual(
    e.intervals.map((row) => [row.n, round(row.accuracy, 3), round(row.width * 100, 1)]),
    [
      [50, 0.76, 23.1],
      [100, 0.75, 16.8],
      [300, 0.72, 10.1],
    ]
  );
});

test("class 2: unsafe trajectories hide behind correct final answers", () => {
  const e = buildEvidence();
  assert.equal(e.unsafeCount, 31);
  assert.equal(round(e.unsafeRate * 100, 1), 10.3);
  assert.equal(e.unsafeHiddenBehindCorrect, 24);
  assert.equal(round(e.unsafeShareOfCorrect * 100, 1), 11.1);
  assert.deepEqual(e.violationCounts, [
    ["cross_tenant_read", 14],
    ["refund_without_eligibility_check", 10],
    ["refund_amount_above_order_total", 5],
    ["duplicate_refund_effect", 5],
  ]);
});

test("class 3: retrieval recall and the accuracy gap it creates", () => {
  const e = buildEvidence();
  assert.equal(round(e.recall * 100, 1), 79.3);
  assert.equal(round(e.accuracyWithEvidence * 100, 1), 80.3);
  assert.equal(round(e.accuracyWithoutEvidence * 100, 1), 40.3);
});

test("class 3: the oracle run separates generation quality from retrieval recall", () => {
  const e = buildEvidence();
  assert.equal(e.missedCount, 62);
  assert.equal(round(e.oracleAccuracyAll * 100, 1), 80.7);
  assert.equal(round(e.oracleAccuracyOnMissed * 100, 1), 82.3);
  assert.equal(round(e.isolatedGenerationGain * 100, 1), 41.9);
});

test("the oracle run keeps the same items and the same draws", () => {
  const items = buildDataset();
  const normal = runVersion(items, "v1");
  const oracle = runVersion(items, "v1", { oracleContext: true });

  assert.equal(normal.length, oracle.length);
  for (let i = 0; i < normal.length; i += 1) {
    assert.equal(oracle[i].id, normal[i].id);
    assert.equal(oracle[i].retrievalHit, true);
    // The classification draw sits between retrieval and the answer, so it
    // proves the two runs stayed aligned on the same random stream.
    assert.equal(oracle[i].classificationCorrect, normal[i].classificationCorrect);
    assert.deepEqual(oracle[i].violations, normal[i].violations);
    if (normal[i].retrievalHit) {
      assert.equal(oracle[i].answerCorrect, normal[i].answerCorrect);
    }
  }
});

test("class 4: cost and latency distribution", () => {
  const e = buildEvidence();
  assert.equal(round(e.costMean, 4), 0.0157);
  assert.equal(round(e.costP50, 4), 0.016);
  assert.equal(round(e.costP95, 4), 0.0219);
  assert.equal(round(e.costMax, 4), 0.0265);
  assert.equal(round(e.costTotal, 2), 4.7);
  assert.equal(e.overCost, 42);
  assert.equal(Math.round(e.latencyP50), 2167);
  assert.equal(Math.round(e.latencyP95), 3291);
  assert.equal(e.overLatency, 6);
});

test("class 5: a paired comparison of two versions on the same 300 items", () => {
  const e = buildEvidence();
  assert.equal(round(e.afterAccuracy * 100, 1), 75.7);
  assert.equal(round(e.pairedDelta * 100, 1), 3.7);
  assert.equal(round(e.pairedCiLow * 100, 1), -3.3);
  assert.equal(round(e.pairedCiHigh * 100, 1), 10.3);
  assert.equal(e.onlyBefore, 48);
  assert.equal(e.onlyAfter, 59);
  assert.equal(round(e.mcnemarP, 3), 0.334);
  assert.ok(e.mcnemarP > 0.05, "300 items with one run each cannot resolve 3.7 points");
});

test("grader: judge agreement stays below human agreement", () => {
  const e = buildEvidence();
  assert.equal(round(e.humanKappa, 2), 0.71);
  assert.equal(round(e.judgeKappa, 2), 0.55);
  assert.equal(e.consensusSize, 264);
  assert.equal(round(e.judgeObserved * 100, 1), 80.7);
  assert.ok(e.judgeKappa < e.humanKappa);
});

test("statistics helpers behave on known inputs", () => {
  const wilson = wilsonInterval(50, 100);
  assert.ok(wilson.low < 0.5 && wilson.high > 0.5);
  assert.equal(round(wilson.width, 3), 0.192);

  assert.equal(mcnemar(0, 0).p, 1);
  assert.ok(mcnemar(5, 40).p < 0.001);

  const kappa = cohenKappa([true, true, false, false], [true, true, false, false]);
  assert.equal(kappa.kappa, 1);
});
