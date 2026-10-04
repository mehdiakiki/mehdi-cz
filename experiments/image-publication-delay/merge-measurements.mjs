import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(experimentRoot, "results/perf044-measurement-base.json");
const supplementPath = path.join(experimentRoot, "results/perf044-script-inert.json");
const minimalPath = path.join(experimentRoot, "results/perf044-minimal-shell.json");
const outputPath = path.join(experimentRoot, "results/perf044-measurement.json");
const base = JSON.parse(readFileSync(basePath, "utf8"));
const supplement = JSON.parse(readFileSync(supplementPath, "utf8"));
const minimal = JSON.parse(readFileSync(minimalPath, "utf8"));

assert.equal(base.experiment, supplement.experiment);
assert.equal(base.baseUrl, supplement.baseUrl);
assert.equal(base.method.repetitions, supplement.method.repetitions);
assert.equal(base.method.traceRepetitions, supplement.method.traceRepetitions);
assert.deepEqual(base.method.profiles, supplement.method.profiles);
assert.deepEqual(supplement.method.variants, ["script-inert"]);
assert.deepEqual(minimal.method.variants, ["minimal-shell"]);
assert.equal(base.method.variants.includes("script-inert"), false);
for (const variant of ["full", "script-blocked", "prefix-flush", "decoding-sync"]) {
  assert.equal(base.method.variants.includes(variant), true, `base matrix includes ${variant}`);
}

const merged = {
  ...base,
  generatedAt: new Date().toISOString(),
  method: {
    ...base.method,
    variants: [
      "full",
      "script-blocked",
      "script-inert",
      "prefix-flush",
      "decoding-sync",
      "minimal-shell",
    ],
    sourceFiles: [
      path.basename(basePath),
      path.basename(supplementPath),
      path.basename(minimalPath),
    ],
  },
  runs: [
    ...base.runs.filter((run) => run.variant !== "minimal-shell"),
    ...supplement.runs,
    ...minimal.runs,
  ],
};

writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Merged ${merged.runs.length} runs into ${outputPath}`);
