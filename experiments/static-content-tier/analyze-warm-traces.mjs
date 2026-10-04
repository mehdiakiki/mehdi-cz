import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const traceRoot = path.resolve(process.argv[2] || "/tmp/perf030-warm");
const outputPath = path.resolve(
  process.argv[3] || path.join(fixtureRoot, "results/warm-navigation-measurement.json")
);
const profile = {
  browser: "Chrome DevTools performance trace",
  sourceState: "homepage loaded in a new isolated context",
  action: "hover target, wait 400 ms for intent prefetch, then click article link",
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  mobile: true,
  touch: true,
  cpuSlowdownMultiplier: 4,
  network: "Fast 4G",
  colorScheme: "light",
  runsPerCase: 5,
};
const cases = [
  { variant: "next-client", stem: "perf030-warm-current", mode: "soft" },
  { variant: "document-full-css", stem: "perf030-warm-full", mode: "document" },
  {
    variant: "document-pruned-css",
    stem: "perf030-warm-pruned",
    mode: "document",
  },
  {
    variant: "document-shared-pruned-css",
    stem: "perf030-warm-shared",
    mode: "document",
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

function cumulativeLayoutShift(events, start, end) {
  return round(
    events
      .filter(
        (event) =>
          event.name === "LayoutShift" &&
          event.ts >= start &&
          event.ts <= end &&
          event.args?.data?.had_recent_input !== true &&
          event.args?.data?.is_main_frame !== false
      )
      .reduce(
        (total, event) =>
          total + (event.args?.data?.weighted_score_delta ?? event.args?.data?.score ?? 0),
        0
      )
  );
}

function networkSummary(events, end) {
  const sends = events.filter(
    (event) =>
      event.name === "ResourceSendRequest" &&
      event.ts <= end &&
      !String(event.args?.data?.url || "").startsWith("data:")
  );
  const requestIds = new Set(sends.map((event) => event.args?.data?.requestId).filter(Boolean));
  const responses = events.filter(
    (event) =>
      event.name === "ResourceReceiveResponse" &&
      requestIds.has(event.args?.data?.requestId) &&
      event.ts <= end
  );
  const finishes = events.filter(
    (event) =>
      event.name === "ResourceFinish" &&
      requestIds.has(event.args?.data?.requestId) &&
      event.ts <= end
  );
  const articleDocumentResponses = responses.filter(
    (event) =>
      event.args?.data?.resourceType === "Document" ||
      sends.some(
        (send) =>
          send.args?.data?.requestId === event.args?.data?.requestId &&
          send.args?.data?.resourceType === "Document"
      )
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
    responsesFromCache: responses.filter((event) => event.args?.data?.fromCache === true).length,
    documentNavigationFromPrefetchCache: articleDocumentResponses.some(
      (event) => event.args?.data?.fromCache === true
    ),
  };
}

function analyzeTrace(filename, mode) {
  const events = traceEvents(filename);
  const click = events.find(
    (event) => event.name === "EventDispatch" && event.args?.data?.type === "click"
  );
  if (!click) throw new Error(`Cannot find article-link click in ${filename}`);

  let urlCommit;
  let contentfulPaint;
  let lcp;
  let completionSource;
  if (mode === "soft") {
    const softNavigation = events.find(
      (event) =>
        event.name === "SoftNavigationStart" &&
        event.args?.context?.URL?.includes("/blog/reconciliation-cross-system-sync")
    );
    urlCommit = events.find(
      (event) => event.name === "SoftNavigationHeuristics::SameDocumentNavigationCommitted"
    );
    contentfulPaint = softNavigation?.args?.context?.firstContentfulPaint;
    completionSource = "Chrome soft-navigation firstContentfulPaint context timestamp";
    if (!softNavigation || !urlCommit || !contentfulPaint) {
      throw new Error(`Incomplete soft-navigation attribution in ${filename}`);
    }
  } else {
    const navigation = events.find(
      (event) =>
        event.name === "navigationStart" &&
        event.args?.data?.documentLoaderURL?.includes("/hybrid/") &&
        event.args?.data?.documentLoaderURL?.endsWith("/article")
    );
    if (!navigation) throw new Error(`Cannot find article document navigation in ${filename}`);
    const navigationId = navigation.args.data.navigationId;
    const fcp = events.find(
      (event) =>
        event.name === "firstContentfulPaint" && event.args?.data?.navigationId === navigationId
    );
    lcp = events
      .filter(
        (event) =>
          event.name === "largestContentfulPaint::Candidate" &&
          event.args?.data?.navigationId === navigationId
      )
      .sort(
        (left, right) =>
          (left.args?.data?.candidateIndex ?? 0) - (right.args?.data?.candidateIndex ?? 0) ||
          left.ts - right.ts
      )
      .at(-1);
    if (!fcp || !lcp) throw new Error(`Incomplete document paint attribution in ${filename}`);
    urlCommit = navigation;
    contentfulPaint = fcp.ts;
    completionSource = "document firstContentfulPaint trace event";
  }

  const end = contentfulPaint;
  const runTasks = events.filter(
    (event) =>
      event.ph === "X" &&
      event.name === "RunTask" &&
      event.pid === click.pid &&
      event.tid === click.tid &&
      event.ts >= click.ts &&
      event.ts < end
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
  const network = networkSummary(events, end);
  return {
    file: path.basename(filename),
    mode,
    completionSource,
    clickToContentfulPaintMs: round((contentfulPaint - click.ts) / 1_000),
    clickToUrlCommitMs: round((urlCommit.ts - click.ts) / 1_000),
    clickEventDurationMs: round((click.dur || 0) / 1_000),
    longTaskBlockingToPaintMs: round(
      runTasks.reduce((total, event) => total + Math.max(0, event.dur / 1_000 - 50), 0)
    ),
    scriptMainThreadMs: unionDuration(events, scriptNames, click.ts, end, click.pid, click.tid),
    styleLayoutMainThreadMs: unionDuration(
      events,
      styleLayoutNames,
      click.ts,
      end,
      click.pid,
      click.tid
    ),
    paintMainThreadMs: unionDuration(events, paintNames, click.ts, end, click.pid, click.tid),
    cls: cumulativeLayoutShift(events, click.ts, end),
    network,
    documentLcpEqualsFcp: lcp ? lcp.ts === contentfulPaint : null,
  };
}

const metrics = [
  "clickToContentfulPaintMs",
  "clickToUrlCommitMs",
  "clickEventDurationMs",
  "longTaskBlockingToPaintMs",
  "scriptMainThreadMs",
  "styleLayoutMainThreadMs",
  "paintMainThreadMs",
  "cls",
];

function summarize(runs) {
  const summary = Object.fromEntries(
    metrics.map((metric) => {
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
  for (const metric of ["requests", "encodedBodyBytes", "decodedBodyBytes", "responsesFromCache"]) {
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
    return analyzeTrace(filename, definition.mode);
  });
  return {
    variant: definition.variant,
    mode: definition.mode,
    runs,
    summary: summarize(runs),
  };
});

const reference = results.find((result) => result.variant === "next-client");
const comparisons = results
  .filter((result) => result !== reference)
  .map((result) => {
    const values = {};
    for (const metric of metrics) {
      const before = reference.summary[metric].median;
      const after = result.summary[metric].median;
      values[metric] = {
        before,
        after,
        delta: round(after - before),
        percent: before === 0 ? null : round(((after - before) / before) * 100),
      };
    }
    return { before: reference.variant, after: result.variant, metrics: values };
  });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      traceSource: `${traceRoot}/perf030-warm-*.json.gz (raw traces are intentionally not committed)`,
      profile,
      results,
      comparisons,
      limitations: [
        "Chrome exposes an experimental soft-navigation first-contentful-paint timestamp but no comparable soft-navigation LCP candidate in these traces.",
        "The document variants use document FCP; it equals LCP in all selected document runs.",
        "The 400 ms dwell is excluded from click-to-paint, but its prefetch transfer is included in the network summary.",
        "The content document cache window is 60 seconds; production adoption requires deploy/CDN invalidation.",
        "Localhost lab timings are diagnostic samples, not field Core Web Vitals or visitor-growth evidence.",
      ],
    },
    null,
    2
  )}\n`
);

console.table(
  results.map((result) => ({
    variant: result.variant,
    "click → paint": result.summary.clickToContentfulPaintMs.median,
    "click → URL": result.summary.clickToUrlCommitMs.median,
    "click handler": result.summary.clickEventDurationMs.median,
    "script ms": result.summary.scriptMainThreadMs.median,
    "style/layout ms": result.summary.styleLayoutMainThreadMs.median,
    "blocking ms": result.summary.longTaskBlockingToPaintMs.median,
    "encoded bytes": result.summary["network.encodedBodyBytes"].median,
    CLS: result.summary.cls.median,
  }))
);
