import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.PERF031_BASE_URL || "http://localhost:3120";
const runsPerCase = Number(process.env.PERF031_RUNS || 5);
const hoverMs = Number(process.env.PERF031_HOVER_MS || 1_000);
const startMs = Number(process.env.PERF031_START_MS || 500);
const cases = ["shared", "prerender-immediate", "prerender-dwell"];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const round = (value, places = 3) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function launchRun(variant, runIndex) {
  const profile = mkdtempSync(path.join(tmpdir(), "perf031-measure-"));
  const debugPort = 9_400 + runIndex;
  const url = new URL(`/hybrid/${variant}/home`, baseUrl);
  url.searchParams.set("perf031-autorun", "1");
  url.searchParams.set("start-ms", String(startMs));
  url.searchParams.set("hover-ms", String(hoverMs));
  const chrome = spawn(
    "/opt/google/chrome/chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-color-profile=srgb",
      "--force-device-scale-factor=2",
      "--window-size=390,844",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      url.href,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    let browser;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (response.ok) {
          browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${debugPort}`,
            defaultViewport: null,
          });
          break;
        }
      } catch {}
      await wait(100);
    }
    if (!browser) throw new Error(`Chrome did not expose DevTools:\n${stderr}`);

    await wait(startMs + hoverMs + 1_500);
    const pages = await browser.pages();
    const page = pages.find((candidate) => candidate.url().startsWith(baseUrl));
    if (!page) throw new Error(`Cannot find the test page: ${pages.map((item) => item.url())}`);
    const result = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const firstContentfulPaint = performance
        .getEntriesByType("paint")
        .find((entry) => entry.name === "first-contentful-paint");
      return {
        url: location.href,
        source: JSON.parse(localStorage.getItem("perf031-source-state") || "null"),
        lifecycle: document.documentElement.dataset.perf031Lifecycle || "normal-navigation",
        prerendering: document.prerendering,
        activationStart: navigation?.activationStart ?? null,
        responseStart: navigation?.responseStart ?? null,
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
        load: navigation?.loadEventEnd ?? null,
        transferSize: navigation?.transferSize ?? null,
        encodedBodySize: navigation?.encodedBodySize ?? null,
        decodedBodySize: navigation?.decodedBodySize ?? null,
        deliveryType: navigation?.deliveryType ?? "",
        firstContentfulPaint: firstContentfulPaint?.startTime ?? null,
        clickToFirstContentfulPaint: Number(
          document.documentElement.dataset.perf031MeasureClickToFcp
        ),
        viewport: {
          width: innerWidth,
          height: innerHeight,
          devicePixelRatio,
        },
      };
    });
    result.run = runIndex;
    await browser.close();
    return result;
  } finally {
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGTERM");
      await Promise.race([exited, wait(2_000)]);
    }
    await wait(750);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile ${profile}: ${error.message}`);
    }
  }
}

const runs = Object.fromEntries(cases.map((variant) => [variant, []]));
let sequence = 0;
for (let roundIndex = 0; roundIndex < runsPerCase; roundIndex += 1) {
  const orderedCases = cases
    .slice(roundIndex % cases.length)
    .concat(cases.slice(0, roundIndex % cases.length));
  for (const variant of orderedCases) {
    sequence += 1;
    const result = await launchRun(variant, sequence);
    runs[variant].push(result);
    console.log(
      `${variant} ${runs[variant].length}/${runsPerCase}: ${round(result.clickToFirstContentfulPaint)} ms, activation ${round(result.activationStart)} ms`
    );
  }
}

const numericMetrics = [
  "clickToFirstContentfulPaint",
  "activationStart",
  "firstContentfulPaint",
  "responseStart",
  "domContentLoaded",
  "load",
  "transferSize",
  "encodedBodySize",
  "decodedBodySize",
];
const results = cases.map((variant) => ({
  variant,
  activationSuccesses: runs[variant].filter((run) => run.activationStart > 0).length,
  runs: runs[variant],
  summary: Object.fromEntries(
    numericMetrics.map((metric) => {
      const values = runs[variant].map((run) => run[metric]).filter(Number.isFinite);
      return [
        metric,
        {
          median: round(median(values)),
          min: round(Math.min(...values)),
          max: round(Math.max(...values)),
        },
      ];
    })
  ),
}));
const shared = results.find((result) => result.variant === "shared");
const comparisons = results
  .filter((result) => result !== shared)
  .map((result) => {
    const before = shared.summary.clickToFirstContentfulPaint.median;
    const after = result.summary.clickToFirstContentfulPaint.median;
    return {
      before: shared.variant,
      after: result.variant,
      clickToFirstContentfulPaint: {
        before,
        after,
        delta: round(after - before),
        percent: round(((after - before) / before) * 100),
      },
    };
  });
const output = {
  generatedAt: new Date().toISOString(),
  browser: "Chrome 145 detached headless process",
  profile: {
    baseUrl,
    sourceState: "new browser process and fresh profile per run",
    action: `wait ${startMs} ms, synthetic pointerover, dwell ${hoverMs} ms, then click`,
    requestedWindowCommandLine: { width: 390, height: 844, deviceScaleFactor: 2 },
    observedViewport: { width: 500, height: 705, devicePixelRatio: 2 },
    cpuSlowdownMultiplier: 1,
    network: "localhost, unthrottled",
    runsPerCase,
    rotation: "shared/immediate/dwell order rotated once per round",
    debuggerBoundary:
      "No page target is inspected until after navigation because an attached debugger disables prerendering",
  },
  results,
  comparisons,
  limitations: [
    "This detached-browser protocol is required for actual prerender activation but cannot use DevTools CPU/network emulation during the speculative load.",
    "Chrome headless enforced a 500 CSS-pixel minimum inner width and subtracted window chrome from the requested height; every recorded run observed 500×705 at DPR 2.",
    "Synthetic intent makes the timing repeatable; it does not model the distribution of real hover, focus, touch, or click intent.",
    "Localhost medians are diagnostic lab evidence, not field Core Web Vitals or evidence of visitor growth.",
  ],
};
const outputPath = path.join(fixtureRoot, "results/prerender-navigation-measurement.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.table(
  results.map((result) => ({
    variant: result.variant,
    "activation success": `${result.activationSuccesses}/${runsPerCase}`,
    "click → FCP median": result.summary.clickToFirstContentfulPaint.median,
    min: result.summary.clickToFirstContentfulPaint.min,
    max: result.summary.clickToFirstContentfulPaint.max,
    "document transfer": result.summary.transferSize.median,
  }))
);
