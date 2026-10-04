import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routes } from "./fixture.mjs";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(experimentRoot, "../..");
const requireFromFixture = createRequire(
  path.join(experimentRoot, "../static-content-tier/package.json")
);
const puppeteer = requireFromFixture("puppeteer-core");
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const baseUrl = process.env.PERF045_TAG_BASE_URL || "http://127.0.0.1:3121";
const phase = process.env.PERF045_TAG_PHASE || "before";
const repetitions = Number(process.env.PERF045_TAG_REPETITIONS || 5);
const outputName = process.env.PERF045_TAG_OUTPUT || `perf045-tag-${phase}.json`;

const profiles = [
  { id: "local", network: null },
  {
    id: "controlled",
    network: {
      latencyMs: 150,
      downloadBytesPerSecond: 200_000,
      uploadBytesPerSecond: 93_750,
    },
  },
];

function round(value, places = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function digest(filename) {
  return createHash("sha256").update(readFileSync(filename)).digest("hex");
}

async function measure(browser, { profile, route, mode, repetition }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();
  const requests = new Map();
  const pageErrors = [];
  let navigationTimestamp;

  try {
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.setCacheEnabled(false);
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (profile.network) {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: profile.network.latencyMs,
        downloadThroughput: profile.network.downloadBytesPerSecond,
        uploadThroughput: profile.network.uploadBytesPerSecond,
      });
    }
    cdp.on("Network.requestWillBeSent", (event) => {
      if (
        event.type === "Document" &&
        event.request.url.includes(route.path) &&
        !navigationTimestamp
      ) {
        navigationTimestamp = event.timestamp;
      }
      requests.set(event.requestId, {
        url: event.request.url,
        type: event.type,
        initialPriority: event.request.initialPriority || null,
        initiatorType: event.initiator?.type || null,
        purpose: event.request.headers?.Purpose || event.request.headers?.purpose || null,
        routerPrefetch:
          event.request.headers?.["Next-Router-Prefetch"] ||
          event.request.headers?.["next-router-prefetch"] ||
          null,
        startMs: navigationTimestamp ? round((event.timestamp - navigationTimestamp) * 1_000) : 0,
        encodedDataLength: null,
        finishedMs: null,
      });
    });
    cdp.on("Network.loadingFinished", (event) => {
      const request = requests.get(event.requestId);
      if (!request) return;
      request.encodedDataLength = event.encodedDataLength;
      request.finishedMs = navigationTimestamp
        ? round((event.timestamp - navigationTimestamp) * 1_000)
        : null;
    });

    await page.evaluateOnNewDocument((targetAlt) => {
      globalThis.__perf045Tag = { lcp: [] };
      new PerformanceObserver((list) => {
        globalThis.__perf045Tag.lcp.push(
          ...list.getEntries().map((entry) => ({
            startTime: entry.startTime,
            alt: entry.element?.getAttribute?.("alt") || "",
          }))
        );
      }).observe({ type: "largest-contentful-paint", buffered: true });
      globalThis.__perf045TargetAlt = targetAlt;
    }, route.targetAlt);

    const url = new URL(route.path, baseUrl);
    url.searchParams.set("perf045_tag_phase", phase);
    url.searchParams.set("perf045_tag_run", `${profile.id}-${route.id}-${mode}-${repetition}`);
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(
      (targetAlt) =>
        globalThis.__perf045Tag.lcp.some((entry) => entry.alt === targetAlt) &&
        [...document.images].some((image) => image.alt === targetAlt && image.complete),
      { timeout: 30_000 },
      route.targetAlt
    );
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    let intent = null;
    if (mode === "intent") {
      const tag = await page.$('a[href^="/blog/tags/"]');
      if (!tag) throw new Error(`${route.id}: no tag link`);
      const href = await tag.evaluate((link) => link.getAttribute("href"));
      const beforeIntent = performance.now();
      await tag.hover();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const afterHoverUrl = page.url();
      await Promise.all([
        page.waitForFunction(
          (expected) => location.pathname === expected,
          { timeout: 30_000 },
          href
        ),
        tag.click(),
      ]);
      intent = {
        href,
        hoverWindowMs: round(performance.now() - beforeIntent),
        afterHoverUrl,
        finalUrl: page.url(),
      };
    }

    const observed = await page.evaluate(() => {
      const lcp = globalThis.__perf045Tag.lcp
        .filter((entry) => entry.alt === globalThis.__perf045TargetAlt)
        .at(-1);
      const tag = document.querySelector('a[href^="/blog/tags/"]');
      return {
        lcpMs: lcp?.startTime || null,
        cls: performance
          .getEntriesByType("layout-shift")
          .filter((entry) => !entry.hadRecentInput)
          .reduce((total, entry) => total + entry.value, 0),
        tagHref: tag?.getAttribute("href") || null,
      };
    });
    const requestList = [...requests.values()];
    return {
      profile: profile.id,
      route: route.id,
      mode,
      repetition,
      ...observed,
      intent,
      pageErrors,
      requests: requestList,
      tagRouteChunkRequests: requestList.filter(
        (request) => request.type === "Script" && request.url.includes("/blog/tags/")
      ),
      tagRscRequests: requestList.filter(
        (request) => request.url.includes("/blog/tags/") && request.url.includes("_rsc=")
      ),
      targetImageRequests: requestList.filter(
        (request) =>
          request.type === "Image" && new URL(request.url).searchParams.get("url") === route.source
      ).length,
    };
  } finally {
    await context.close();
  }
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run"],
});
const runs = [];
try {
  for (const profile of profiles) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (const mode of repetition % 2 ? ["idle", "intent"] : ["intent", "idle"]) {
        for (const route of repetition % 2 ? routes : [...routes].reverse()) {
          const run = await measure(browser, { profile, route, mode, repetition });
          runs.push(run);
          console.log(
            `${phase}/${profile.id}/${route.id}/${mode}/${repetition}: ` +
              `LCP=${run.lcpMs}, tagChunk=${run.tagRouteChunkRequests.length}, ` +
              `tagRSC=${run.tagRscRequests.length}, image=${run.targetImageRequests}`
          );
        }
      }
    }
  }
} finally {
  await browser.close();
}

const output = {
  experiment: "PERF-045 tag-route prefetch attribution",
  generatedAt: new Date().toISOString(),
  phase,
  baseUrl,
  buildId: readFileSync(path.join(repositoryRoot, ".next/BUILD_ID"), "utf8").trim(),
  tagSourceSha256: digest(path.join(repositoryRoot, "components/Tag.tsx")),
  method: {
    repetitions,
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
    cache: "Fresh isolated context with browser and CDP cache disabled",
    observationAfterLcpMs: 1_500,
    intentHoverMs: 500,
    profiles,
  },
  runs,
};
writeFileSync(
  path.join(experimentRoot, "results", outputName),
  `${JSON.stringify(output, null, 2)}\n`
);
