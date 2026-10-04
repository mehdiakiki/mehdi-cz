#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(experimentRoot, "../..");
const readJson = async (relative) =>
  JSON.parse(await readFile(path.join(experimentRoot, relative), "utf8"));

const measurement = await readJson("results/perf048-measurement.json");
const journey = await readJson("results/perf048-journey.json");
const analysis = await readJson("results/perf048-analysis.json");
const build = await readJson("results/perf048-build-analysis.json");
const articlePage = await readFile(
  path.join(repositoryRoot, "app/(site)/blog/[...slug]/page.tsx"),
  "utf8"
);
const inlineCssDocs = await readFile(
  path.join(
    repositoryRoot,
    "node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/inlineCss.md"
  ),
  "utf8"
);

assert.equal(measurement.rows.length, 40, "5 x 2 routes x 2 variants x 2 cache states");
assert.equal(journey.rows.length, 20, "5 x 2 directions x 2 variants");
assert.equal(analysis.decision, "do-not-enable-full-inline-css-globally");
assert.equal(
  analysis.nextCandidate,
  "defer-below-fold-article-syntax-math-css-while-keeping-shared-css-cacheable"
);
assert.ok(
  [...measurement.rows, ...journey.rows].every((row) => row.cls === 0),
  "all rows keep CLS at zero"
);
assert.ok(
  build.screenshotPairs.every((pair) => pair.exactMatch),
  "both viewport pairs match exactly"
);
assert.ok(
  build.treeDelta.all.rawBytes > 800_000_000,
  "full inlining adds more than 800 MB to server/app"
);
assert.equal(
  build.treeDelta.indexSegmentRsc.count,
  1563,
  "one extra index segment per non-root HTML route"
);
assert.match(articlePage, /import "css\/prism\.css";/);
assert.match(articlePage, /import "katex\/dist\/katex\.css";/);
assert.match(inlineCssDocs, /applied globally and cannot be configured on a per-page basis/);
assert.match(inlineCssDocs, /once within `<style>` tags for SSR and once in the RSC payload/);

function loadConfig(extraEnvironment = {}) {
  const environment = { ...process.env, ...extraEnvironment };
  delete environment.PERF048_INLINE_CSS;
  delete environment.NEXT_DIST_DIR;
  Object.assign(environment, extraEnvironment);
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const config=require('./next.config.js')();process.stdout.write(JSON.stringify({inlineCss:config.experimental.inlineCss,distDir:config.distDir??null}))",
    ],
    { cwd: repositoryRoot, env: environment, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

assert.deepEqual(
  loadConfig(),
  { inlineCss: false, distDir: null },
  "production default stays external"
);
assert.deepEqual(
  loadConfig({ PERF048_INLINE_CSS: "true", NEXT_DIST_DIR: ".next-perf048-test" }),
  { inlineCss: true, distDir: ".next-perf048-test" },
  "isolated experiment switch remains reproducible"
);

console.log(
  "PERF-048 verification passed (40 reload rows, 20 cross-route rows, twin builds, exact visuals)."
);
