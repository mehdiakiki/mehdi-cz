import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { detectWithGlobalStacks, detectWithPerThreadStacks } from "./model.mjs";

const scenarios = JSON.parse(await readFile(new URL("./scenarios.json", import.meta.url), "utf8"));

test("does not attribute main-thread layout to background V8 parsing", () => {
  const events = scenarios.crossThreadBackgroundParse;

  assert.deepEqual(
    detectWithGlobalStacks(events).map((event) => event.name),
    ["UpdateLayoutTree", "Layout"],
    "the current global stacks reproduce the false forced-reflow warning"
  );
  assert.deepEqual(detectWithPerThreadStacks(events), []);
});

test("retains genuine forced-reflow attribution on one thread", () => {
  const events = scenarios.sameThreadJavaScript;
  const expected = ["UpdateLayoutTree", "Layout"];

  assert.deepEqual(
    detectWithGlobalStacks(events).map((event) => event.name),
    expected
  );
  assert.deepEqual(
    detectWithPerThreadStacks(events).map((event) => event.name),
    expected
  );
});
