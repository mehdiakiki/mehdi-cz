import assert from "node:assert/strict";
import test from "node:test";
import { canUseTrial, inclusiveTrial } from "./trial-policy.mjs";

const startedAtMs = Date.parse("2026-10-01T12:00:00Z");
const expiresAtMs = Date.parse("2026-10-15T12:00:00Z");
const examples = [
  ["before activation", startedAtMs - 1, false],
  ["at activation", startedAtMs, true],
  ["one millisecond before expiry", expiresAtMs - 1, true],
  ["at expiry", expiresAtMs, false],
  ["after expiry", expiresAtMs + 1, false],
];

for (const [name, nowMs, expected] of examples) {
  test(`trial contract: ${name}`, () => {
    assert.equal(canUseTrial({ startedAtMs, nowMs }), expected);
  });
}

test("the independently specified expiry case rejects the faulty implementation", () => {
  const atExpiry = { startedAtMs, nowMs: expiresAtMs };
  assert.equal(inclusiveTrial(atExpiry), true);
  assert.equal(canUseTrial(atExpiry), false);
});

test("unusable or overflowing trusted timestamps fail closed", () => {
  for (const value of [NaN, Infinity, "2026-10-01", null, 1.5]) {
    assert.equal(canUseTrial({ startedAtMs: value, nowMs: startedAtMs }), false);
    assert.equal(canUseTrial({ startedAtMs, nowMs: value }), false);
  }
  assert.equal(canUseTrial({ startedAtMs: Number.MAX_SAFE_INTEGER, nowMs: 0 }), false);
});
