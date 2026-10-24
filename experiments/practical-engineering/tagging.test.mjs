import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_ID, createLocalEngine, parseTags, tagNote } from "./tagging.ts";

test("local completion is called with the note and a bounded request", async () => {
  let request;
  const engine = { chat: { completions: { create: async (value) => {
    request = value;
    return { choices: [{ finish_reason: "stop", message: { content: '{"tags":["work","travel"]}' } }] };
  } } } };
  assert.deepEqual(await tagNote(engine, "Book the train for next week's work visit."), ["work", "travel"]);
  assert.equal(request.messages[1].content, "Book the train for next week's work visit.");
  assert.equal(request.max_tokens, 64);
  assert.equal(request.stream, false);
});

test("output rejects unknown, duplicate, empty, malformed, or excessive tags", () => {
  for (const content of [
    '{"tags":["admin"]}', '{"tags":["work","work"]}', '{"tags":[]}',
    '{"tags":["work","travel","home","study"]}', '{"tags":["work"],"extra":1}',
    '{"tags":[1]}', '```json\n{"tags":["work"]}\n```', 'null', '{}', 'x'.repeat(513),
  ]) assert.throws(() => parseTags(content));
});

test("truncation is rejected even when the returned text happens to parse", async () => {
  const engine = { chat: { completions: { create: async () => ({
    choices: [{ finish_reason: "length", message: { content: '{"tags":["work"]}' } }],
  }) } } };
  await assert.rejects(tagNote(engine, "Plan the work visit."), /did not finish/);
});

test("invalid notes never call the model", async () => {
  let calls = 0;
  const engine = { chat: { completions: { create: async () => { calls++; } } } };
  for (const note of ["", "   ", "x".repeat(2001), null]) await assert.rejects(tagNote(engine, note));
  assert.equal(calls, 0);
});

test("initialization distinguishes a missing adapter from a load failure", async () => {
  assert.deepEqual(await createLocalEngine(undefined, { gpu: { requestAdapter: async () => null } }), { kind: "unsupported" });
  assert.deepEqual(await createLocalEngine(undefined, {
    gpu: { requestAdapter: async () => ({}) },
    loadSdk: async () => ({ CreateMLCEngine: async () => { throw new Error("download failed"); } }),
  }), { kind: "failed" });
  const engine = {};
  const ready = await createLocalEngine(undefined, {
    gpu: { requestAdapter: async () => ({}) },
    loadSdk: async () => ({ CreateMLCEngine: async (id) => { assert.equal(id, MODEL_ID); return engine; } }),
  });
  assert.equal(ready.kind, "ready");
  assert.equal(ready.engine, engine);
});
