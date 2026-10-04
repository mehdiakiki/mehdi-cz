import assert from "node:assert/strict";
import test from "node:test";
import { pruneCriticalCss } from "./prune-critical.mjs";

test("retains transitive custom-property dependencies", () => {
  const input = ":root{--used:var(--dependency);--dependency:red;--unused:blue}.target{color:var(--used)}";
  const { css, usedProperties } = pruneCriticalCss(input);
  assert.deepEqual(usedProperties, ["--dependency", "--used"]);
  assert.match(css, /--used:/);
  assert.match(css, /--dependency:/);
  assert.doesNotMatch(css, /--unused:/);
});

test("removes unused registrations and keyframes", () => {
  const input =
    "@property --used{syntax:'*';initial-value:red;inherits:false}@property --unused{syntax:'*';initial-value:blue;inherits:false}.target{color:var(--used);animation:spin 1s}@keyframes spin{to{opacity:0}}@keyframes idle{to{opacity:1}}";
  const { css } = pruneCriticalCss(input);
  assert.match(css, /@property --used/);
  assert.doesNotMatch(css, /@property --unused/);
  assert.match(css, /@keyframes spin/);
  assert.doesNotMatch(css, /@keyframes idle/);
});
