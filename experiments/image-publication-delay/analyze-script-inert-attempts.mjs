import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const resultRoot = path.join(experimentRoot, "results");
const attempts = [
  {
    id: "default-high-priority-preloads",
    input: "perf044-script-inert-high-priority.json",
  },
  { id: "corrected-low-priority-preloads", input: "perf044-script-inert.json" },
].map((definition) => ({
  ...definition,
  document: JSON.parse(readFileSync(path.join(resultRoot, definition.input), "utf8")),
}));

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const groups = attempts.flatMap((attempt) =>
  ["local", "controlled"].flatMap((profile) =>
    ["control-plane", "load-balancer"].map((route) => {
      const runs = attempt.document.runs.filter(
        (run) => !run.traceEnabled && run.profile === profile && run.route === route
      );
      return {
        attempt: attempt.id,
        profile,
        route,
        runs: runs.length,
        lcpMs: round(median(runs.map((run) => run.lcp.startTime))),
        imageResponseEndMs: round(median(runs.map((run) => run.image.resource.responseEnd))),
        renderDelayMs: round(
          median(runs.map((run) => run.lcp.startTime - run.image.resource.responseEnd))
        ),
      };
    })
  )
);

const output = {
  experiment: "PERF-044 script-inert preload-priority correction",
  generatedAt: new Date().toISOString(),
  attempts: attempts.map(({ id, input }) => ({ id, input })),
  groups,
  conclusion:
    "The first control is excluded: default script preloads raised nine chunks from Low to High priority. The corrected control adds fetchpriority=low and is the only script-inert dataset merged into the primary analysis.",
};
const outputPath = path.join(resultRoot, "perf044-script-inert-attempts.json");
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(groups);
console.log(`Wrote ${outputPath}`);
