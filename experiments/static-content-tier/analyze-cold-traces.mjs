import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const traceRoot = path.resolve(process.argv[2] || "/tmp/perf030-cold");
const outputPath = path.resolve(
  process.argv[3] || path.join(fixtureRoot, "results/cold-browser-measurement.json")
);
const profile = {
  browser: "Chrome DevTools performance trace",
  navigation: "cold about:blank navigation in a new isolated browser context per run",
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  mobile: true,
  touch: true,
  cpuSlowdownMultiplier: 4,
  network: "Fast 4G",
  colorScheme: "light",
  runsPerCase: 5,
};
const cases = [
  { page: "home", variant: "current", stem: "perf030-cold-home-current" },
  { page: "home", variant: "full-css", stem: "perf030-cold-home-full" },
  { page: "home", variant: "pruned-css", stem: "perf030-cold-home-pruned" },
  {
    page: "home",
    variant: "shared-pruned-css",
    stem: "perf030-cold-home-shared",
  },
  { page: "article", variant: "current", stem: "perf030-cold-article-current" },
  { page: "article", variant: "full-css", stem: "perf030-cold-article-full" },
  { page: "article", variant: "pruned-css", stem: "perf030-cold-article-pruned" },
  {
    page: "article",
    variant: "shared-pruned-css",
    stem: "perf030-cold-article-shared",
  },
];
const round = (value, places = 3) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function traceEvents(filename) {
  const parsed = JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)));
  if (!Array.isArray(parsed.traceEvents)) throw new Error(`${filename} has no traceEvents`);
  return parsed.traceEvents;
}

function unionDuration(events, names, start, end, pid, tid) {
  const intervals = events
    .filter(
      (event) =>
        event.ph === "X" &&
        event.pid === pid &&
        event.tid === tid &&
        names.has(event.name) &&
        event.dur > 0 &&
        event.ts < end &&
        event.ts + event.dur > start
    )
    .map((event) => [Math.max(start, event.ts), Math.min(end, event.ts + event.dur)])
    .sort((left, right) => left[0] - right[0]);
  let total = 0;
  let openStart;
  let openEnd;
  for (const [intervalStart, intervalEnd] of intervals) {
    if (openStart === undefined || intervalStart > openEnd) {
      if (openStart !== undefined) total += openEnd - openStart;
      openStart = intervalStart;
      openEnd = intervalEnd;
    } else {
      openEnd = Math.max(openEnd, intervalEnd);
    }
  }
  if (openStart !== undefined) total += openEnd - openStart;
  return round(total / 1_000);
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
    .sort((left, right) => left.time - right.time);
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

function networkSummary(events, navigation, end, frame) {
  const requestIds = new Set(
    events
      .filter(
        (event) =>
          event.name === "ResourceSendRequest" &&
          event.ts >= navigation.ts &&
          event.ts < end &&
          event.args?.data?.frame === frame &&
          !String(event.args?.data?.url || "").startsWith("data:")
      )
      .map((event) => event.args?.data?.requestId)
      .filter(Boolean)
  );
  const finishes = events.filter(
    (event) =>
      event.name === "ResourceFinish" &&
      requestIds.has(event.args?.data?.requestId) &&
      event.ts >= navigation.ts &&
      event.ts < end
  );
  return {
    requests: requestIds.size,
    encodedBodyBytes: finishes.reduce(
      (total, event) => total + (event.args?.data?.encodedDataLength || 0),
      0
    ),
    decodedBodyBytes: finishes.reduce(
      (total, event) => total + (event.args?.data?.decodedBodyLength || 0),
      0
    ),
  };
}

function analyzeTrace(filename) {
  const events = traceEvents(filename);
  const navigation = events.find(
    (event) =>
      event.name === "navigationStart" &&
      event.args?.data?.isLoadingMainFrame === true &&
      event.args?.data?.documentLoaderURL?.includes("perf030=cold")
  );
  if (!navigation) throw new Error(`Cannot find measured navigation in ${filename}`);
  const navigationId = navigation.args.data.navigationId;
  const frame = navigation.args.frame;
  const laterNavigation = events.find(
    (event) =>
      event.name === "navigationStart" &&
      event.ts > navigation.ts &&
      event.args?.frame === frame &&
      event.args?.data?.isLoadingMainFrame === true
  );
  const traceEnd = laterNavigation?.ts ?? Number.POSITIVE_INFINITY;
  const inNavigation = (event) => event.ts >= navigation.ts && event.ts < traceEnd;
  const find = (name) =>
    events.find(
      (event) =>
        event.name === name &&
        (event.args?.data?.frame === frame || event.args?.frame === frame) &&
        inNavigation(event)
    );
  const fcp = events.find(
    (event) =>
      event.name === "firstContentfulPaint" &&
      event.args?.data?.navigationId === navigationId &&
      inNavigation(event)
  );
  const lcp = events
    .filter(
      (event) =>
        event.name === "largestContentfulPaint::Candidate" &&
        event.args?.data?.navigationId === navigationId &&
        inNavigation(event)
    )
    .sort(
      (left, right) =>
        (left.args?.data?.candidateIndex ?? 0) - (right.args?.data?.candidateIndex ?? 0) ||
        left.ts - right.ts
    )
    .at(-1);
  const domContentLoaded = find("MarkDOMContent");
  const load = find("MarkLoad");
  for (const [name, event] of [
    ["FCP", fcp],
    ["LCP", lcp],
    ["DOMContentLoaded", domContentLoaded],
    ["load", load],
  ]) {
    if (!event) throw new Error(`Cannot find ${name} in ${filename}`);
  }

  const end = Math.max(load.ts, lcp.ts);
  const elapsed = (event) => round((event.ts - navigation.ts) / 1_000);
  const runTasks = events.filter(
    (event) =>
      event.ph === "X" &&
      event.name === "RunTask" &&
      event.pid === navigation.pid &&
      event.tid === navigation.tid &&
      event.ts >= navigation.ts &&
      event.ts < end
  );
  const longTaskBlockingToVisualCompleteMs = round(
    runTasks.reduce((total, event) => total + Math.max(0, event.dur / 1_000 - 50), 0)
  );
  const scriptNames = new Set([
    "EvaluateScript",
    "FunctionCall",
    "EventDispatch",
    "RunMicrotasks",
    "TimerFire",
    "FireAnimationFrame",
    "v8.run",
  ]);
  const styleLayoutNames = new Set(["UpdateLayoutTree", "Layout"]);
  const paintNames = new Set(["Paint", "PaintImage", "CompositeLayers"]);

  return {
    file: path.basename(filename),
    url: navigation.args.data.documentLoaderURL,
    fcpMs: elapsed(fcp),
    lcpMs: elapsed(lcp),
    domContentLoadedMs: elapsed(domContentLoaded),
    loadMs: elapsed(load),
    cls: cumulativeLayoutShift(events, navigation, traceEnd),
    longTaskBlockingToVisualCompleteMs,
    scriptMainThreadMs: unionDuration(
      events,
      scriptNames,
      navigation.ts,
      end,
      navigation.pid,
      navigation.tid
    ),
    styleLayoutMainThreadMs: unionDuration(
      events,
      styleLayoutNames,
      navigation.ts,
      end,
      navigation.pid,
      navigation.tid
    ),
    paintMainThreadMs: unionDuration(
      events,
      paintNames,
      navigation.ts,
      end,
      navigation.pid,
      navigation.tid
    ),
    network: networkSummary(events, navigation, traceEnd, frame),
    lcpElement: { type: lcp.args?.data?.type, nodeName: lcp.args?.data?.nodeName },
  };
}

const numericMetrics = [
  "fcpMs",
  "lcpMs",
  "domContentLoadedMs",
  "loadMs",
  "cls",
  "longTaskBlockingToVisualCompleteMs",
  "scriptMainThreadMs",
  "styleLayoutMainThreadMs",
  "paintMainThreadMs",
];

function summarize(runs) {
  const summary = Object.fromEntries(
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
  for (const metric of ["requests", "encodedBodyBytes", "decodedBodyBytes"]) {
    const values = runs.map((run) => run.network[metric]);
    summary[`network.${metric}`] = {
      median: round(median(values)),
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
    };
  }
  return summary;
}

const results = cases.map((definition) => {
  const runs = Array.from({ length: profile.runsPerCase }, (_, index) => {
    const filename = path.join(traceRoot, `${definition.stem}-${index + 1}.json.gz`);
    if (!fs.existsSync(filename)) throw new Error(`Missing trace: ${filename}`);
    return analyzeTrace(filename);
  });
  return { page: definition.page, variant: definition.variant, runs, summary: summarize(runs) };
});

function comparison(page, beforeVariant, afterVariant) {
  const before = results.find((result) => result.page === page && result.variant === beforeVariant);
  const after = results.find((result) => result.page === page && result.variant === afterVariant);
  const metrics = {};
  for (const metric of numericMetrics) {
    const beforeValue = before.summary[metric].median;
    const afterValue = after.summary[metric].median;
    metrics[metric] = {
      before: beforeValue,
      after: afterValue,
      delta: round(afterValue - beforeValue),
      percent: beforeValue === 0 ? null : round(((afterValue - beforeValue) / beforeValue) * 100),
    };
  }
  return { page, before: beforeVariant, after: afterVariant, metrics };
}

const comparisons = [];
for (const page of ["home", "article"]) {
  comparisons.push(comparison(page, "current", "full-css"));
  comparisons.push(comparison(page, "current", "pruned-css"));
  comparisons.push(comparison(page, "current", "shared-pruned-css"));
  comparisons.push(comparison(page, "full-css", "pruned-css"));
  comparisons.push(comparison(page, "full-css", "shared-pruned-css"));
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      traceSource: `${traceRoot}/perf030-cold-*.json.gz (raw traces are intentionally not committed)`,
      profile,
      results,
      comparisons,
      limitations: [
        "Localhost lab timings are diagnostic samples, not field Core Web Vitals.",
        "Navigation-only traces do not establish INP or visitor growth.",
        "The encoded resource-byte trace field is a browser diagnostic and is secondary to deterministic artifact compression.",
        "Main-thread categories are union durations for selected trace events through max(load, LCP), not a complete CPU accounting.",
        "Long-task blocking is sum(max(task - 50 ms, 0)) through visual completion; it is not Lighthouse TBT, whose observation window differs.",
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
    "script ms": result.summary.scriptMainThreadMs.median,
    "style/layout ms": result.summary.styleLayoutMainThreadMs.median,
    "long-task blocking": result.summary.longTaskBlockingToVisualCompleteMs.median,
    CLS: result.summary.cls.median,
  }))
);
