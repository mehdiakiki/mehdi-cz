import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const requireFromFixture = createRequire(
  path.join(experimentRoot, "../static-content-tier/package.json")
);
const puppeteer = requireFromFixture("puppeteer-core");
const baseUrl = process.env.PERF042_BASE_URL || "http://127.0.0.1:3121";
const phase = process.env.PERF042_PHASE || "lazy-high";
const repetitions = Number(process.env.PERF042_REPETITIONS || 5);
const outputPath = path.join(experimentRoot, "results", `perf042-${phase}.json`);
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";

const routes = [
  {
    id: "control-plane",
    path: "/blog/design-control-plane-distributed-database",
    targetAlt: "Control plane architecture schema for a distributed database",
  },
  {
    id: "load-balancer",
    path: "/blog/load-balancer-sticky-sessions-course",
    targetAlt: "Load Balancer Architecture",
  },
];

const profiles = [
  { id: "mobile", width: 390, height: 844, mobile: true },
  { id: "desktop", width: 1440, height: 1000, mobile: false },
];

const transport = {
  latencyMs: 150,
  downloadBytesPerSecond: 200_000,
  uploadBytesPerSecond: 93_750,
};

function round(value, places = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-color-profile=srgb",
  ],
});

const runs = [];

try {
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    for (const profile of profiles) {
      for (const route of routes) {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        const cdp = await page.createCDPSession();
        const imageRequests = new Map();

        await page.setViewport({
          width: profile.width,
          height: profile.height,
          deviceScaleFactor: 1,
          isMobile: profile.mobile,
          hasTouch: profile.mobile,
        });
        await page.setCacheEnabled(false);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: transport.latencyMs,
          downloadThroughput: transport.downloadBytesPerSecond,
          uploadThroughput: transport.uploadBytesPerSecond,
        });

        cdp.on("Network.requestWillBeSent", (event) => {
          if (event.type !== "Image") return;
          imageRequests.set(event.requestId, {
            requestId: event.requestId,
            url: event.request.url,
            initialPriority: event.request.initialPriority || null,
            initiatorType: event.initiator?.type || null,
            priorityChanges: [],
            encodedDataLength: null,
          });
        });
        cdp.on("Network.resourceChangedPriority", (event) => {
          const request = imageRequests.get(event.requestId);
          if (request) request.priorityChanges.push(event.newPriority);
        });
        cdp.on("Network.loadingFinished", (event) => {
          const request = imageRequests.get(event.requestId);
          if (request) request.encodedDataLength = event.encodedDataLength;
        });

        await page.evaluateOnNewDocument(() => {
          globalThis.__perf042Lcp = [];
          new PerformanceObserver((list) => {
            globalThis.__perf042Lcp.push(
              ...list.getEntries().map((entry) => ({
                startTime: entry.startTime,
                tagName: entry.element?.tagName || "",
                alt: entry.element?.getAttribute?.("alt") || "",
                text: entry.element?.textContent?.trim?.().slice(0, 120) || "",
                url: entry.url || "",
              }))
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });
        });

        const response = await page.goto(new URL(route.path, baseUrl).href, {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });
        if (!response?.ok()) throw new Error(`${route.path} returned ${response?.status()}`);
        const documentHeaders = response.headers();
        const documentBody = await response.buffer();

        await page.waitForFunction(
          (targetAlt) => [...document.images].some((image) => image.alt === targetAlt),
          { timeout: 30_000 },
          route.targetAlt
        );
        await new Promise((resolve) => setTimeout(resolve, 2_500));

        const pageResult = await page.evaluate((targetAlt) => {
          const image = [...document.images].find((candidate) => candidate.alt === targetAlt);
          const box = image.getBoundingClientRect();
          const resource = performance
            .getEntriesByType("resource")
            .find((entry) => entry.name === image.currentSrc);
          const navigation = performance.getEntriesByType("navigation")[0];
          const preloads = [...document.querySelectorAll('link[rel="preload"][as="image"]')].map(
            (link) => ({
              href: link.href,
              media: link.media,
              mediaMatches: link.media ? matchMedia(link.media).matches : true,
              imageSrcSet: link.imageSrcset,
              imageSizes: link.imageSizes,
              fetchPriority: link.fetchPriority,
            })
          );
          return {
            viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
            image: {
              alt: image.alt,
              top: box.top,
              bottom: box.bottom,
              width: box.width,
              height: box.height,
              distanceBelowViewport: Math.max(0, box.top - innerHeight),
              intersectsViewport: box.top < innerHeight && box.bottom > 0,
              loading: image.loading,
              fetchPriority: image.fetchPriority,
              complete: image.complete,
              currentSrc: image.currentSrc,
              srcSet: image.srcset,
              sizes: image.sizes,
              resourceStart: resource?.startTime ?? null,
              responseEnd: resource?.responseEnd ?? null,
              encodedBodyBytes: resource?.encodedBodySize ?? null,
              resourceInitiatorType: resource?.initiatorType ?? null,
            },
            lcp: globalThis.__perf042Lcp.at(-1) || null,
            navigation: {
              responseStart: navigation?.responseStart ?? null,
              domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
              loadEventEnd: navigation?.loadEventEnd ?? null,
            },
            preloads,
          };
        }, route.targetAlt);

        const targetRequests = [...imageRequests.values()].filter(
          (request) => request.url === pageResult.image.currentSrc
        );
        const targetRequest = targetRequests[0];
        const run = {
          runId: `${phase}-${profile.id}-${route.id}-${repetition}`,
          phase,
          repetition,
          route: route.id,
          path: route.path,
          profile: profile.id,
          document: {
            bodyBytes: documentBody.byteLength,
            linkHeader: documentHeaders.link || null,
          },
          ...pageResult,
          image: {
            ...pageResult.image,
            top: round(pageResult.image.top),
            bottom: round(pageResult.image.bottom),
            width: round(pageResult.image.width),
            height: round(pageResult.image.height),
            distanceBelowViewport: round(pageResult.image.distanceBelowViewport),
            resourceStart: round(pageResult.image.resourceStart),
            responseEnd: round(pageResult.image.responseEnd),
            requestCount: targetRequests.length,
            requestObserved: Boolean(targetRequest),
            initialPriority: targetRequest?.initialPriority || null,
            initiatorType: targetRequest?.initiatorType || null,
            priorityChanges: targetRequest?.priorityChanges || [],
            networkEncodedBytes: targetRequest?.encodedDataLength ?? null,
          },
          lcp: pageResult.lcp
            ? { ...pageResult.lcp, startTime: round(pageResult.lcp.startTime) }
            : null,
          navigation: Object.fromEntries(
            Object.entries(pageResult.navigation).map(([key, value]) => [key, round(value)])
          ),
        };
        runs.push(run);
        console.log(
          `${run.runId}: start=${run.image.resourceStart}, priority=${run.image.initialPriority}, ` +
            `requests=${run.image.requestCount}, preloads=${run.preloads.length}, ` +
            `media=${run.preloads[0]?.mediaMatches ?? "none"}, lcp=${run.lcp?.startTime ?? "none"}`
        );
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const output = {
  experiment: "PERF-042",
  phase,
  generatedAt: new Date().toISOString(),
  baseUrl,
  repetitions,
  transport,
  method: {
    cache: "Fresh isolated browser context with browser and CDP cache disabled per run",
    network: "Deterministic CDP latency and throughput applied before navigation",
    observation:
      "No scrolling; record responsive preload media matching, exact image request count, discovery timing, priority, and final LCP 2.5 seconds after DOMContentLoaded",
    matrix: "Two live MDX-image routes at 390x844 mobile and 1440x1000 desktop, DPR 1",
  },
  runs,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
