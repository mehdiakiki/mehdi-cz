#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(experimentRoot, "results/measurement.json");
const outputPath = path.join(experimentRoot, "results/summary.json");
const measurement = JSON.parse(await readFile(inputPath, "utf8"));

function median(values) {
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function cssTotal(row, field, status) {
  return row.initial.css
    .filter((entry) => !status || entry.renderBlockingStatus === status)
    .reduce((total, entry) => total + entry[field], 0);
}

const metricReaders = {
  fcpMs: (row) => row.initial.fcpMs,
  lcpMs: (row) => row.initial.lcpMs,
  loadMs: (row) => row.initial.loadMs,
  navigationTransferBytes: (row) => row.initial.navigationTransferBytes,
  cssTransferBytes: (row) => cssTotal(row, "transferBytes"),
  cssEncodedBytes: (row) => cssTotal(row, "encodedBytes"),
  cssDecodedBytes: (row) => cssTotal(row, "decodedBytes"),
  blockingCssTransferBytes: (row) => cssTotal(row, "transferBytes", "blocking"),
  blockingCssEncodedBytes: (row) => cssTotal(row, "encodedBytes", "blocking"),
  blockingCssDecodedBytes: (row) => cssTotal(row, "decodedBytes", "blocking"),
};

const routes = {};
for (const route of measurement.routes) {
  const rows = measurement.rows.filter((row) => row.route === route.id);
  const variants = Object.fromEntries(
    measurement.variants.map((variant) => {
      const matches = rows.filter((row) => row.variant === variant.id);
      return [
        variant.id,
        {
          medians: Object.fromEntries(
            Object.entries(metricReaders).map(([metric, read]) => [
              metric,
              median(matches.map(read)),
            ])
          ),
          maxInitialCls: Math.max(...matches.map((row) => row.initial.cls)),
          maxPromotedCls: Math.max(...matches.map((row) => row.promoted?.cls || 0)),
        },
      ];
    })
  );
  const pairedAfterMinusBefore = Object.fromEntries(
    Object.entries(metricReaders).map(([metric, read]) => {
      const differences = [];
      for (let repetition = 1; repetition <= measurement.repetitions; repetition += 1) {
        const before = rows.find(
          (row) => row.variant === "before" && row.repetition === repetition
        );
        const after = rows.find((row) => row.variant === "after" && row.repetition === repetition);
        differences.push(read(after) - read(before));
      }
      return [metric, { median: median(differences), values: differences }];
    })
  );

  routes[route.id] = { variants, pairedAfterMinusBefore };
}

const result = {
  experiment: "PERF-049",
  generatedAt: new Date().toISOString(),
  source: path.relative(experimentRoot, inputPath),
  methodology: measurement.methodology,
  repetitions: measurement.repetitions,
  profile: measurement.profile,
  routes,
};

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(routes, null, 2));
console.log(`Wrote ${path.relative(path.resolve(experimentRoot, "../.."), outputPath)}`);
