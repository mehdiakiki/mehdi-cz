import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const local = (name) => fileURLToPath(new URL(name, import.meta.url));

test("the documented selector command emits the transitive selection as JSON", async () => {
  const { stdout } = await execute(process.execPath, [local("./select-affected.mjs"), local("./package-graph.json"), local("./changed-files.json")]);
  assert.deepEqual(JSON.parse(stdout).checks, ["app-admin", "app-web", "formatting", "reporting"]);
});

test("the CLI gate exits unsuccessfully when a selected result is skipped", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "editorial-gate-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reportPath = path.join(directory, "report.json");
  await writeFile(reportPath, JSON.stringify({ selectorConclusion: "success", selection: { kind: "affected", checks: ["app-web"] }, results: [{ name: "app-web", conclusion: "skipped" }] }));
  await assert.rejects(execute(process.execPath, [local("./required-gate.mjs"), reportPath]), (error) => error.code === 1 && error.stderr.includes("required gate failed"));
});

test("the CLI gate accepts an explicit successful selection", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "editorial-gate-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reportPath = path.join(directory, "report.json");
  await writeFile(reportPath, JSON.stringify({ selectorConclusion: "success", selection: { kind: "affected", checks: ["app-web"] }, results: [{ name: "app-web", conclusion: "success" }] }));
  const { stdout } = await execute(process.execPath, [local("./required-gate.mjs"), reportPath]);
  assert.match(stdout, /required gate passed/);
});

test("the queue CLI keeps constructed-data provenance and its observation time", async () => {
  const { stdout } = await execute(process.execPath, [local("./summarize-review-queue.mjs"), local("./review-queue-snapshot.json")]);
  const report = JSON.parse(stdout);
  assert.match(report.kind, /constructed/);
  assert.equal(report.observedAt, "2026-10-24T12:00:00Z");
  assert.deepEqual(report.rows.slice(0, 3).map(({ elapsedHours }) => elapsedHours), [27, 11, 6]);
});
