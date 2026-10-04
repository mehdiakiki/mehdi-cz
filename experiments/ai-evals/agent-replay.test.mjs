// The cassette is the regression test. These checks pin what the
// "record-and-replay harness" article claims.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CASSETTE_DIR, CASSETTE_NAME, hybrid, record, replay } from "./agent-replay.mjs";
import { cassettePath, DivergenceError, diffArgs, loadCassette } from "./cassette.mjs";

const EXPECTED_TRAJECTORY = [
  "search_policy",
  "lookup_order",
  "check_refund_eligibility",
  "issue_refund",
];

test("recording captures every decision and every tool result", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "cassette-"));
  const { cassette, stats, outcome } = await record({ directory });

  assert.equal(stats.liveDecisions, 4);
  assert.equal(stats.liveToolCalls, 4);
  assert.equal(cassette.steps.length, 8);
  assert.deepEqual(cassette.final.tools, EXPECTED_TRAJECTORY);
  assert.equal(outcome.answer, "Handled the ticket.");
});

test("the committed cassette matches a fresh recording", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "cassette-"));
  await record({ directory });
  const fresh = readFileSync(cassettePath(directory, CASSETTE_NAME), "utf8");
  const committed = readFileSync(cassettePath(CASSETTE_DIR, CASSETTE_NAME), "utf8");
  assert.equal(fresh, committed);
});

test("replay makes zero live calls and reproduces the trajectory", async () => {
  const { stats, outcome, elapsedMs } = await replay();

  assert.equal(stats.liveDecisions, 0);
  assert.equal(stats.liveToolCalls, 0);
  assert.equal(stats.replayedDecisions, 4);
  assert.equal(stats.replayedToolCalls, 4);
  assert.deepEqual(
    outcome.transcript.map((entry) => entry.tool),
    EXPECTED_TRAJECTORY
  );
  assert.ok(elapsedMs < 50, `replay took ${elapsedMs.toFixed(1)} ms, expected well under 50`);
});

test("the refund is capped to the order total, and the cassette proves it", () => {
  const cassette = loadCassette(CASSETTE_DIR, CASSETTE_NAME);
  const refund = cassette.steps.find((step) => step.name === "issue_refund");
  const intent = cassette.steps.find(
    (step) => step.kind === "decision" && step.decision.intent === "issue_refund"
  );
  assert.equal(intent.decision.amountCents, 19000);
  assert.equal(refund.args.amountCents, 14500);
});

test("removing the eligibility check diverges on the tool name", async () => {
  await assert.rejects(
    () => replay({ agentOptions: { requireEligibilityCheck: false } }),
    (error) => {
      assert.ok(error instanceof DivergenceError);
      assert.match(error.message, /divergence at tool call 2/);
      assert.match(error.message, /expected tool: check_refund_eligibility/);
      assert.match(error.message, /actual tool:   issue_refund/);
      return true;
    }
  );
});

test("removing the refund cap diverges only on the arguments", async () => {
  await assert.rejects(
    () => replay({ agentOptions: { capRefundToOrderTotal: false } }),
    (error) => {
      assert.ok(error instanceof DivergenceError);
      assert.match(error.message, /divergence at tool call 3 \(issue_refund\)/);
      assert.match(error.message, /-amountCents: 14500/);
      assert.match(error.message, /\+amountCents: 19000/);
      assert.equal(error.details.expected.name, "issue_refund");
      return true;
    }
  );
});

test("a run that stops early is a divergence too", async () => {
  await assert.rejects(
    () => replay({ agentOptions: { maxSteps: 3 } }),
    (error) => error instanceof Error
  );
});

test("hybrid mode replays decisions but executes tools", async () => {
  const { stats } = await hybrid();
  assert.equal(stats.liveDecisions, 0);
  assert.equal(stats.replayedDecisions, 4);
  assert.equal(stats.liveToolCalls, 4);
});

test("the argument diff marks only the fields that changed", () => {
  const diff = diffArgs({ orderId: "ord-1", amountCents: 100 }, { orderId: "ord-1", amountCents: 200 });
  assert.equal(diff, '  -amountCents: 100\n  +amountCents: 200\n   orderId: "ord-1"');
});
