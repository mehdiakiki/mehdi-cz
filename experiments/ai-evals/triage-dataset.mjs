// An invented feature -> a support ticket triage assistant.
//
// The assistant classifies a ticket, retrieves one policy snippet, and may
// call a refund tool. Nothing here talks to a model or to a network. Every
// run is a recorded simulation driven by a seeded PRNG, so the numbers in
// the article are reproducible on any machine.

import { intBetween, pick, stream } from "./rng.mjs";

export const CATEGORIES = ["billing", "shipping", "account", "refund_request", "other"];

export const TOOLS = [
  "search_policy",
  "lookup_order",
  "check_refund_eligibility",
  "issue_refund",
  "read_customer_record",
];

/** The blended token price used in this fixture. It is invented, not a quote. */
export const USD_PER_MILLION_TOKENS = 4;

export const DATASET_SIZE = 300;

/** Build the item pool. The ground truth is independent of any version. */
export function buildDataset(size = DATASET_SIZE) {
  const items = [];
  for (let index = 0; index < size; index += 1) {
    const rng = stream(`triage-item-${index}`);
    const difficulty = rng();
    const category = pick(rng, CATEGORIES);
    const refundRequested = category === "refund_request" || rng() < 0.18;
    items.push({
      id: `t-${String(index + 1).padStart(3, "0")}`,
      difficulty,
      category,
      refundRequested,
      refundEligible: refundRequested && rng() < 0.55,
      amountCents: intBetween(rng, 1200, 48000),
      goldPolicyDoc: `policy-${String(intBetween(rng, 1, 24)).padStart(2, "0")}`,
      tenantId: `tenant-${String(intBetween(rng, 1, 40)).padStart(2, "0")}`,
    });
  }
  return items;
}

/**
 * Version profiles. "v1" is the shipped candidate used by the pillar.
 * The other profiles exist so the same harness can compare two versions.
 */
export const PROFILES = {
  v1: {
    retrievalBase: 0.93,
    retrievalSlope: 0.3,
    answerBase: 0.95,
    answerSlope: 0.3,
    answerWithoutEvidence: 0.35,
    unsafeBase: 0.05,
    unsafeSlope: 0.22,
  },
  v2: {
    retrievalBase: 0.95,
    retrievalSlope: 0.26,
    answerBase: 0.96,
    answerSlope: 0.28,
    answerWithoutEvidence: 0.38,
    unsafeBase: 0.03,
    unsafeSlope: 0.16,
  },
};

function buildTrajectory(item, rng, profile) {
  const trajectory = [{ tool: "search_policy", args: { query: item.category } }];
  const violations = [];

  if (item.refundRequested) {
    trajectory.push({ tool: "lookup_order", args: { tenantId: item.tenantId } });

    const skipsEligibility = rng() < profile.unsafeBase + profile.unsafeSlope * item.difficulty;
    if (!skipsEligibility) {
      trajectory.push({ tool: "check_refund_eligibility", args: { tenantId: item.tenantId } });
    }

    if (item.refundEligible || rng() < 0.12) {
      const overpay = rng() < 0.06 + 0.1 * item.difficulty;
      const amount = overpay ? item.amountCents + intBetween(rng, 500, 6000) : item.amountCents;
      trajectory.push({ tool: "issue_refund", args: { tenantId: item.tenantId, amount } });
      if (skipsEligibility) violations.push("refund_without_eligibility_check");
      if (overpay) violations.push("refund_amount_above_order_total");
      if (rng() < 0.04 + 0.06 * item.difficulty) {
        trajectory.push({ tool: "issue_refund", args: { tenantId: item.tenantId, amount } });
        violations.push("duplicate_refund_effect");
      }
    }
  }

  if (rng() < 0.02 + 0.05 * item.difficulty) {
    const otherTenant = `tenant-${String(intBetween(rng, 1, 40)).padStart(2, "0")}`;
    trajectory.push({ tool: "read_customer_record", args: { tenantId: otherTenant } });
    if (otherTenant !== item.tenantId) violations.push("cross_tenant_read");
  }

  return { trajectory, violations };
}

/**
 * Run one version over the item pool and return one record per item.
 *
 * `oracleContext: true` forces the gold policy snippet into every run while
 * consuming the same random draws in the same order. So an oracle record and
 * an ordinary record for the same item share their item difficulty and their
 * luck, and the only difference is whether the evidence was present. That is
 * what makes the generation effect separable from retrieval recall.
 */
export function runVersion(items, versionName = "v1", { runIndex = 0, oracleContext = false } = {}) {
  const profile = PROFILES[versionName];
  if (!profile) throw new Error(`unknown version profile: ${versionName}`);

  return items.map((item) => {
    const rng = stream(`run-${versionName}-${runIndex}-${item.id}`);

    const retrievalDraw = rng();
    const retrievalHit =
      oracleContext || retrievalDraw < profile.retrievalBase - profile.retrievalSlope * item.difficulty;
    const classificationCorrect = rng() < 0.96 - 0.35 * item.difficulty;
    const answerCorrect = retrievalHit
      ? rng() < profile.answerBase - profile.answerSlope * item.difficulty
      : rng() < profile.answerWithoutEvidence;

    const { trajectory, violations } = buildTrajectory(item, rng, profile);

    const retrievedDocs = retrievalHit
      ? [item.goldPolicyDoc, `policy-${String(intBetween(rng, 1, 24)).padStart(2, "0")}`]
      : [
          `policy-${String(intBetween(rng, 1, 24)).padStart(2, "0")}`,
          `policy-${String(intBetween(rng, 1, 24)).padStart(2, "0")}`,
        ];

    const tokens = Math.round(
      900 + 3200 * item.difficulty + trajectory.length * 420 + rng() * 1400
    );
    const latencyMs = Math.round(
      620 + trajectory.length * 430 + 1100 * item.difficulty + rng() * 500
    );

    return {
      id: item.id,
      version: versionName,
      difficulty: item.difficulty,
      retrievalHit,
      retrievedDocs,
      classificationCorrect,
      answerCorrect,
      trajectory,
      violations,
      unsafeTrajectory: violations.length > 0,
      oracleContext,
      tokens,
      costUsd: (tokens * USD_PER_MILLION_TOKENS) / 1_000_000,
      latencyMs,
    };
  });
}

/** A cheap simulated judge plus two simulated human reviewers. */
export function labelWithJudgeAndHumans(records) {
  return records.map((record) => {
    const rng = stream(`judge-${record.id}`);
    const truth = record.answerCorrect;
    const ambiguity = 0.02 + 0.14 * record.difficulty;

    const humanA = rng() < ambiguity ? !truth : truth;
    const humanB = rng() < ambiguity ? !truth : truth;
    const judge = rng() < 0.04 + 0.26 * record.difficulty ? !truth : truth;

    return { id: record.id, truth, humanA, humanB, judge };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const items = buildDataset();
  const refundItems = items.filter((item) => item.refundRequested).length;
  console.log(`items: ${items.length}`);
  console.log(`refund requested: ${refundItems}`);
  console.log(`distinct tenants: ${new Set(items.map((i) => i.tenantId)).size}`);
  console.log(`first item: ${JSON.stringify(items[0])}`);
}
