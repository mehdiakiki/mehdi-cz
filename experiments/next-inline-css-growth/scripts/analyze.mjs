#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(experimentRoot, "results/perf048-measurement.json");
const journeyPath = path.join(experimentRoot, "results/perf048-journey.json");
const outputPath = path.join(experimentRoot, "results/perf048-analysis.json");
const measurement = JSON.parse(await readFile(inputPath, "utf8"));
const journey = JSON.parse(await readFile(journeyPath, "utf8"));

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const round = (value, digits = 1) => Number(value.toFixed(digits));
const summarize = (values) => ({
  median: round(median(values)),
  min: round(Math.min(...values)),
  max: round(Math.max(...values)),
});

const groups = [];
for (const route of measurement.routes.map(({ id }) => id)) {
  for (const variant of measurement.variants.map(({ id }) => id)) {
    for (const cacheState of ["cold", "warm"]) {
      const rows = measurement.rows.filter(
        (row) => row.route === route && row.variant === variant && row.cacheState === cacheState
      );
      assert.equal(
        rows.length,
        measurement.repetitions,
        `${route}/${variant}/${cacheState} sample count`
      );
      groups.push({
        route,
        variant,
        cacheState,
        sampleCount: rows.length,
        lcpMs: summarize(rows.map((row) => row.lcpMs)),
        fcpMs: summarize(rows.map((row) => row.fcpMs)),
        responseStartMs: summarize(rows.map((row) => row.navigation.responseStartMs)),
        loadMs: summarize(rows.map((row) => row.navigation.loadMs)),
        documentEncodedBytes: summarize(rows.map((row) => row.navigation.encodedBytes)),
        cssRequestCount: summarize(rows.map((row) => row.css.count)),
        cssTransferBytes: summarize(rows.map((row) => row.css.transferBytes)),
        cssEncodedBytes: summarize(rows.map((row) => row.css.encodedBytes)),
        totalTransferBytes: summarize(
          rows.map((row) => row.navigation.transferBytes + row.allResources.transferBytes)
        ),
        totalEncodedBytes: summarize(
          rows.map((row) => row.navigation.encodedBytes + row.allResources.encodedBytes)
        ),
        longTaskCount: summarize(rows.map((row) => row.longTasks.length)),
        longTaskDurationMs: summarize(
          rows.map((row) => row.longTasks.reduce((sum, task) => sum + task.duration, 0))
        ),
        cls: summarize(rows.map((row) => row.cls)),
      });
    }
  }
}

function pairedDeltas(rows, route, cacheState) {
  const pairs = [];
  for (let repetition = 1; repetition <= measurement.repetitions; repetition += 1) {
    const external = rows.find(
      (row) =>
        row.repetition === repetition &&
        row.route === route &&
        row.cacheState === cacheState &&
        row.variant === "external"
    );
    const inline = rows.find(
      (row) =>
        row.repetition === repetition &&
        row.route === route &&
        row.cacheState === cacheState &&
        row.variant === "inline"
    );
    assert.ok(external && inline, `${route}/${cacheState}/${repetition} pair exists`);
    const externalTransfer =
      external.navigation.transferBytes + external.allResources.transferBytes;
    const inlineTransfer = inline.navigation.transferBytes + inline.allResources.transferBytes;
    pairs.push({
      repetition,
      lcpMs: inline.lcpMs - external.lcpMs,
      lcpPercent: ((inline.lcpMs - external.lcpMs) / external.lcpMs) * 100,
      loadMs: inline.navigation.loadMs - external.navigation.loadMs,
      totalTransferBytes: inlineTransfer - externalTransfer,
      longTaskDurationMs:
        inline.longTasks.reduce((sum, task) => sum + task.duration, 0) -
        external.longTasks.reduce((sum, task) => sum + task.duration, 0),
    });
  }
  return {
    lcpMs: summarize(pairs.map((pair) => pair.lcpMs)),
    lcpPercent: summarize(pairs.map((pair) => pair.lcpPercent)),
    loadMs: summarize(pairs.map((pair) => pair.loadMs)),
    totalTransferBytes: summarize(pairs.map((pair) => pair.totalTransferBytes)),
    longTaskDurationMs: summarize(pairs.map((pair) => pair.longTaskDurationMs)),
    inlineFasterLcpCount: pairs.filter((pair) => pair.lcpMs < 0).length,
    inlineSlowerLcpCount: pairs.filter((pair) => pair.lcpMs > 0).length,
    equalLcpCount: pairs.filter((pair) => pair.lcpMs === 0).length,
    pairs: pairs.map((pair) =>
      Object.fromEntries(Object.entries(pair).map(([key, value]) => [key, round(value)]))
    ),
  };
}

const deltas = [];
for (const route of measurement.routes.map(({ id }) => id)) {
  for (const cacheState of ["cold", "warm"]) {
    const external = groups.find(
      (group) =>
        group.route === route && group.variant === "external" && group.cacheState === cacheState
    );
    const inline = groups.find(
      (group) =>
        group.route === route && group.variant === "inline" && group.cacheState === cacheState
    );
    const delta = (metric) => round(inline[metric].median - external[metric].median);
    const percent = (metric) => round((delta(metric) / external[metric].median) * 100);
    deltas.push({
      route,
      cacheState,
      paired: pairedDeltas(measurement.rows, route, cacheState),
      inlineMinusExternal: {
        lcpMs: delta("lcpMs"),
        lcpPercent: percent("lcpMs"),
        loadMs: delta("loadMs"),
        loadPercent: percent("loadMs"),
        documentEncodedBytes: delta("documentEncodedBytes"),
        documentEncodedPercent: percent("documentEncodedBytes"),
        totalEncodedBytes: delta("totalEncodedBytes"),
        totalEncodedPercent: percent("totalEncodedBytes"),
        longTaskDurationMs: delta("longTaskDurationMs"),
      },
    });
  }
}

const journeyGroups = [];
for (const route of journey.routes.map(({ id }) => id)) {
  for (const variant of journey.variants.map(({ id }) => id)) {
    const rows = journey.rows.filter((row) => row.route === route && row.variant === variant);
    assert.equal(rows.length, journey.repetitions, `${route}/${variant}/cross-route sample count`);
    journeyGroups.push({
      sourceRoute: rows[0].sourceRoute,
      route,
      variant,
      sampleCount: rows.length,
      lcpMs: summarize(rows.map((row) => row.lcpMs)),
      loadMs: summarize(rows.map((row) => row.navigation.loadMs)),
      documentTransferBytes: summarize(rows.map((row) => row.navigation.transferBytes)),
      cssTransferBytes: summarize(rows.map((row) => row.css.transferBytes)),
      totalTransferBytes: summarize(
        rows.map((row) => row.navigation.transferBytes + row.allResources.transferBytes)
      ),
      cls: summarize(rows.map((row) => row.cls)),
    });
  }
}

const journeyDeltas = journey.routes.map((route) => ({
  sourceRoute: journey.rows.find((row) => row.route === route.id)?.sourceRoute,
  route: route.id,
  paired: pairedDeltas(journey.rows, route.id, "cross-route"),
}));

assert.ok(
  measurement.rows.every((row) => row.visibilityState === "visible"),
  "every measurement is visible"
);
const expectedPathnames = Object.fromEntries(
  measurement.routes.map((route) => [route.id, route.pathname])
);
assert.ok(
  measurement.rows.every((row) => row.pathname === expectedPathnames[row.route]),
  "every route identity is retained"
);
assert.ok(
  measurement.rows.every((row) => row.cls === 0),
  "every row retains zero CLS"
);
assert.ok(
  journey.rows.every((row) => row.cls === 0),
  "every cross-route row retains zero CLS"
);
assert.ok(
  groups
    .filter((group) => group.variant === "inline")
    .every((group) => group.cssRequestCount.median === 0),
  "inline build emits no external CSS request"
);
assert.ok(
  groups
    .filter((group) => group.variant === "external")
    .every((group) => group.cssRequestCount.median === (group.route === "home" ? 1 : 2)),
  "external build retains expected CSS request count"
);
assert.ok(
  deltas
    .filter((delta) => delta.cacheState === "cold")
    .every((delta) => delta.inlineMinusExternal.lcpMs < 0),
  "inline CSS improves cold LCP on both routes"
);
assert.ok(
  deltas
    .filter((delta) => delta.cacheState === "warm")
    .every((delta) => delta.inlineMinusExternal.lcpMs > 0),
  "inline CSS regresses warm LCP on both routes"
);
assert.ok(
  deltas
    .filter((delta) => delta.cacheState === "cold")
    .every((delta) => delta.inlineMinusExternal.totalEncodedBytes > 0),
  "inline CSS increases complete cold encoded transfer on both routes"
);
assert.ok(
  journeyDeltas.every((delta) => delta.paired.totalTransferBytes.median > 0),
  "inline CSS increases transferred bytes on both cross-route destinations"
);
assert.equal(
  journeyDeltas.find((delta) => delta.route === "article").paired.inlineFasterLcpCount,
  journey.repetitions,
  "inline CSS improves article LCP after the homepage in every repetition"
);

const analysis = {
  experiment: measurement.experiment,
  analyzedAt: new Date().toISOString(),
  decision: "do-not-enable-full-inline-css-globally",
  nextCandidate: "defer-below-fold-article-syntax-math-css-while-keeping-shared-css-cacheable",
  claims: [
    "Full CSS inlining substantially improves cold LCP in the controlled low-end mobile profile.",
    "Same-route warm-reload median LCP regresses on both representative routes.",
    "Next.js duplicates inlined CSS into HTML and RSC, so total cold encoded transfer rises even though CSS requests disappear.",
    "After the homepage has cached shared CSS, the article still benefits from removing its route-local Prism/KaTeX CSS gate, while the homepage gets no stable cross-route LCP benefit from full inlining.",
    "The locally actionable follow-up is to remove below-the-fold syntax/math CSS from the critical path while keeping shared CSS cacheable.",
  ],
  groups,
  deltas,
  journeyGroups,
  journeyDeltas,
};

await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(
  JSON.stringify(
    { decision: analysis.decision, nextCandidate: analysis.nextCandidate, deltas, journeyDeltas },
    null,
    2
  )
);
