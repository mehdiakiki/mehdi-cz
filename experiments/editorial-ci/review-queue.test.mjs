import assert from "node:assert/strict";
import test from "node:test";
import { summarizeQueue } from "./review-queue.mjs";

const nowMs = Date.parse("2026-10-24T12:00:00Z");
const waiting = { number: 101, stage: "first-review", stageEnteredAt: "2026-10-23T09:00:00Z", waitingFor: "import owner", draft: false };

test("stage age comes from its transition, not PR creation time", () => {
  assert.equal(summarizeQueue([waiting], nowMs)[0].elapsedHours, 27);
});

test("drafts are excluded and the oldest current stage is first", () => {
  const records = [waiting, { ...waiting, number: 102, stage: "author-rework", stageEnteredAt: "2026-10-24T01:00:00Z" }, { ...waiting, number: 103, draft: true }];
  assert.deepEqual(summarizeQueue(records, nowMs).map(({ number }) => number), [101, 102]);
});

test("unknown stages, future transitions, and duplicate records fail visibly", () => {
  assert.throws(() => summarizeQueue([{ ...waiting, stage: "done" }], nowMs));
  assert.throws(() => summarizeQueue([{ ...waiting, stageEnteredAt: "2026-10-25T00:00:00Z" }], nowMs));
  assert.throws(() => summarizeQueue([waiting, waiting], nowMs));
  assert.throws(() => summarizeQueue([{ ...waiting, draft: "false" }], nowMs));
});
