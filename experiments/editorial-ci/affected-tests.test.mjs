import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { requiredResult, selectAffected } from "./affected-tests.mjs";

const graph = JSON.parse(await readFile(new URL("./package-graph.json", import.meta.url), "utf8"));

test("a shared package includes direct and transitive consumers but not independent docs", () => {
  assert.deepEqual(selectAffected(graph, ["packages/formatting/date.mjs"]).checks,
    ["app-admin", "app-web", "formatting", "reporting"]);
});

test("an application edit does not select sibling applications", () => {
  assert.deepEqual(selectAffected(graph, ["apps/app-web/page.mjs"]).checks, ["app-web"]);
});

test("lockfile, unknown path, and unavailable base choose the complete declared suite", () => {
  for (const path of ["yarn.lock", "scripts/generate.mjs", ".github/workflows/check.yml"]) {
    assert.equal(selectAffected(graph, [path]).kind, "all");
  }
  assert.equal(selectAffected(graph, [], { fullReason: "comparison base unavailable" }).checks.length, graph.length);
});

test("invalid graph and missing diff fail instead of selecting no checks", () => {
  assert.throws(() => selectAffected(undefined, []));
  assert.throws(() => selectAffected(graph, undefined));
  assert.throws(() => selectAffected(graph, ["../outside"]));
  assert.throws(() => selectAffected([{ name: "a", directory: "a", dependencies: ["missing"] }], ["a/file"]));
});

test("a gate rejects failed, skipped, cancelled, missing, or duplicate selected results", () => {
  const selection = selectAffected(graph, ["apps/app-web/page.mjs"]);
  const report = (results, selectorConclusion = "success") => ({ selectorConclusion, selection, results });
  assert.equal(requiredResult(report([{ name: "app-web", conclusion: "success" }])), true);
  for (const conclusion of ["failure", "skipped", "cancelled", "neutral"]) {
    assert.equal(requiredResult(report([{ name: "app-web", conclusion }])), false);
  }
  assert.equal(requiredResult(report([])), false);
  assert.equal(requiredResult(report([{ name: "app-web", conclusion: "success" }], "failure")), false);
  assert.equal(requiredResult(report([{ name: "app-web", conclusion: "success" }, { name: "app-web", conclusion: "success" }])), false);
});

test("a legitimate empty diff differs from a failed selector", () => {
  const selection = selectAffected(graph, []);
  assert.equal(requiredResult({ selectorConclusion: "success", selection, results: [] }), true);
  assert.equal(requiredResult({ selectorConclusion: "failure", selection, results: [] }), false);
  assert.equal(requiredResult({ selectorConclusion: "success", selection: { kind: "affected", checks: [] }, results: [] }), false);
});
