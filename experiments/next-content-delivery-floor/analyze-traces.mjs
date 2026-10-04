import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const traceRoot = path.resolve(process.argv[2] || "/tmp");
const outputPath = path.resolve(
  process.argv[3] || path.join(fixtureRoot, "results/browser-measurement.json")
);

const profile = {
  browser: "Chrome DevTools performance trace",
  navigation: "cold isolated browser context per run",
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  mobile: true,
  touch: true,
  cpuSlowdownMultiplier: 4,
  network: "Fast 4G",
  colorScheme: "light",
  runsPerCase: 5,
};

const cases = [
  { page: "home", variant: "current", stem: "perf029-home-current" },
  {
    page: "home",
    variant: "server-only",
    stem: "perf029-home-server-final",
  },
  {
    page: "home",
    variant: "plain-html",
    stem: "perf029-home-plain-patched",
  },
  { page: "article", variant: "current", stem: "perf029-article-current" },
  {
    page: "article",
    variant: "server-only",
    stem: "perf029-article-server-final",
  },
  {
    page: "article",
    variant: "plain-html",
    stem: "perf029-article-plain-patched",
  },
];

const round = (value, places = 3) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function traceEvents(file) {
  const compressed = fs.readFileSync(file);
  const parsed = JSON.parse(zlib.gunzipSync(compressed));
  if (!Array.isArray(parsed.traceEvents)) {
    throw new Error(`${file} does not contain traceEvents`);
  }
  return parsed.traceEvents;
}

function cumulativeLayoutShift(events, navigation, end) {
  const shifts = events
    .filter(
      (event) =>
        event.name === "LayoutShift" &&
        event.ts >= navigation.ts &&
        event.ts < end &&
        event.args?.data?.had_recent_input !== true &&
        event.args?.data?.is_main_frame !== false
    )
    .map((event) => ({
      time: event.ts / 1_000,
      value: event.args?.data?.weighted_score_delta ?? event.args?.data?.score ?? 0,
    }))
    .sort((a, b) => a.time - b.time);

  let maximum = 0;
  let windowStart;
  let previous;
  let current = 0;
  for (const shift of shifts) {
    if (
      windowStart === undefined ||
      shift.time - previous > 1_000 ||
      shift.time - windowStart > 5_000
    ) {
      windowStart = shift.time;
      current = 0;
    }
    current += shift.value;
    maximum = Math.max(maximum, current);
    previous = shift.time;
  }
  return round(maximum);
}

function analyzeTrace(file) {
  const events = traceEvents(file);
  const navigation = events.find(
    (event) =>
      event.name === "navigationStart" &&
      event.args?.data?.isLoadingMainFrame === true &&
      event.args?.data?.documentLoaderURL?.includes("perf029")
  );
  if (!navigation) throw new Error(`Cannot find measured navigation in ${file}`);

  const navigationId = navigation.args.data.navigationId;
  const frame = navigation.args.frame;
  const laterNavigation = events.find(
    (event) =>
      event.name === "navigationStart" &&
      event.ts > navigation.ts &&
      event.args?.frame === frame &&
      event.args?.data?.isLoadingMainFrame === true
  );
  const end = laterNavigation?.ts ?? Number.POSITIVE_INFINITY;
  const afterNavigation = (event) => event.ts >= navigation.ts && event.ts < end;

  const fcp = events.find(
    (event) =>
      event.name === "firstContentfulPaint" &&
      event.args?.data?.navigationId === navigationId &&
      afterNavigation(event)
  );
  const lcpCandidates = events.filter(
    (event) =>
      event.name === "largestContentfulPaint::Candidate" &&
      event.args?.data?.navigationId === navigationId &&
      afterNavigation(event)
  );
  const lcp = lcpCandidates
    .sort(
      (left, right) =>
        (left.args?.data?.candidateIndex ?? 0) - (right.args?.data?.candidateIndex ?? 0) ||
        left.ts - right.ts
    )
    .at(-1);
  const domContentLoaded = events.find(
    (event) =>
      event.name === "MarkDOMContent" && event.args?.data?.frame === frame && afterNavigation(event)
  );
  const load = events.find(
    (event) =>
      event.name === "MarkLoad" && event.args?.data?.frame === frame && afterNavigation(event)
  );

  for (const [name, event] of [
    ["FCP", fcp],
    ["LCP", lcp],
    ["DOMContentLoaded", domContentLoaded],
    ["load", load],
  ]) {
    if (!event) throw new Error(`Cannot find ${name} in ${file}`);
  }

  const elapsed = (event) => round((event.ts - navigation.ts) / 1_000);
  return {
    file: path.basename(file),
    url: navigation.args.data.documentLoaderURL,
    fcpMs: elapsed(fcp),
    lcpMs: elapsed(lcp),
    domContentLoadedMs: elapsed(domContentLoaded),
    loadMs: elapsed(load),
    cls: cumulativeLayoutShift(events, navigation, end),
    lcpElement: {
      type: lcp.args?.data?.type,
      nodeName: lcp.args?.data?.nodeName,
    },
  };
}

function summarize(runs) {
  const numericMetrics = ["fcpMs", "lcpMs", "domContentLoadedMs", "loadMs", "cls"];
  return Object.fromEntries(
    numericMetrics.map((metric) => {
      const values = runs.map((run) => run[metric]);
      return [
        metric,
        {
          median: round(median(values)),
          min: round(Math.min(...values)),
          max: round(Math.max(...values)),
        },
      ];
    })
  );
}

const results = cases.map((item) => {
  const runs = Array.from({ length: profile.runsPerCase }, (_, index) => {
    const file = path.join(traceRoot, `${item.stem}-${index + 1}.json.gz`);
    if (!fs.existsSync(file)) throw new Error(`Missing trace: ${file}`);
    return analyzeTrace(file);
  });
  return { page: item.page, variant: item.variant, runs, summary: summarize(runs) };
});

const comparisons = [];
for (const page of ["home", "article"]) {
  const current = results.find((result) => result.page === page && result.variant === "current");
  for (const variant of ["server-only", "plain-html"]) {
    const candidate = results.find((result) => result.page === page && result.variant === variant);
    const metrics = {};
    for (const metric of ["fcpMs", "lcpMs", "domContentLoadedMs", "loadMs", "cls"]) {
      const before = current.summary[metric].median;
      const after = candidate.summary[metric].median;
      metrics[metric] = {
        before,
        after,
        delta: round(after - before),
        percent: before === 0 ? null : round(((after - before) / before) * 100),
      };
    }
    comparisons.push({ page, variant, metrics });
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      traceSource: `${traceRoot}/perf029-*.json.gz (raw traces are intentionally not committed)`,
      profile,
      results,
      comparisons,
      limitations: [
        "Localhost lab timings are diagnostic samples, not field Core Web Vitals.",
        "The plain-HTML runs use the validated Route Handler header fix so their HTML is gzip-compressed like the page responses.",
        "The server-only and plain-HTML variants preserve first-render semantics, but intentionally leave interactive controls inert.",
        "No TBT or INP claim is made from these navigation-only traces.",
      ],
    },
    null,
    2
  )}\n`
);

console.table(
  results.map((result) => ({
    page: result.page,
    variant: result.variant,
    "FCP median": result.summary.fcpMs.median,
    "LCP median": result.summary.lcpMs.median,
    "DCL median": result.summary.domContentLoadedMs.median,
    "load median": result.summary.loadMs.median,
    CLS: result.summary.cls.median,
  }))
);
