import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const requireFromFixture = createRequire(
  path.join(experimentRoot, "../static-content-tier/package.json")
);
const puppeteer = requireFromFixture("puppeteer-core");
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const baseUrl = process.env.PERF043_BASE_URL || "http://127.0.0.1:3121";
const variant = process.env.PERF043_PRELOAD_VARIANT || "full";
const standardRepetitions = Number(process.env.PERF043_REPETITIONS || 5);
const probeRepetitions = Number(process.env.PERF043_PROBE_REPETITIONS || 1);
const dprs = [0.8, 1, 1.25, 1.5, 2, 3];
const routes = [
  {
    id: "control-plane",
    path: "/blog/design-control-plane-distributed-database",
    source: "/static/images/system-design-db-control-pane.webp",
    targetAlt: "Control plane architecture schema for a distributed database",
  },
  {
    id: "load-balancer",
    path: "/blog/load-balancer-sticky-sessions-course",
    source: "/static/images/stick-sessions-load-balancer.webp",
    targetAlt: "Load Balancer Architecture",
  },
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

function sourceForRequest(url) {
  try {
    return new URL(url).searchParams.get("url");
  } catch {
    return null;
  }
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run"],
});
const runs = [];

try {
  for (const dpr of dprs) {
    const repetitions = dpr === 1 || dpr === 2 ? standardRepetitions : probeRepetitions;
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (const route of routes) {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        const cdp = await page.createCDPSession();
        const requests = new Map();
        let documentRequestId;
        let documentEncodedDataLength = null;

        await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: dpr });
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
          if (event.type === "Document" && event.request.url.includes(route.path)) {
            documentRequestId = event.requestId;
          }
          if (event.type !== "Image" || sourceForRequest(event.request.url) !== route.source)
            return;
          requests.set(event.requestId, {
            url: event.request.url,
            initialPriority: event.request.initialPriority || null,
            initiatorType: event.initiator?.type || null,
            encodedDataLength: null,
          });
        });
        cdp.on("Network.loadingFinished", (event) => {
          if (event.requestId === documentRequestId) {
            documentEncodedDataLength = event.encodedDataLength;
          }
          const request = requests.get(event.requestId);
          if (request) request.encodedDataLength = event.encodedDataLength;
        });

        await page.evaluateOnNewDocument(() => {
          globalThis.__perf043Lcp = [];
          new PerformanceObserver((list) => {
            globalThis.__perf043Lcp.push(
              ...list.getEntries().map((entry) => ({
                startTime: entry.startTime,
                tagName: entry.element?.tagName || "",
                alt: entry.element?.getAttribute?.("alt") || "",
                url: entry.url || "",
              }))
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });
        });

        const response = await page.goto(new URL(route.path, baseUrl).href, {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });
        assert.ok(response?.ok(), `${route.path} returned ${response?.status()}`);
        const documentBody = await response.buffer();
        await page.waitForFunction(
          (targetAlt) => [...document.images].some((image) => image.alt === targetAlt),
          { timeout: 30_000 },
          route.targetAlt
        );
        await new Promise((resolve) => setTimeout(resolve, 3_000));

        const observed = await page.evaluate((targetAlt) => {
          const image = [...document.images].find((candidate) => candidate.alt === targetAlt);
          const resource = performance
            .getEntriesByType("resource")
            .find((entry) => entry.name === image.currentSrc);
          const preload = [...document.querySelectorAll('link[rel="preload"][as="image"]')].find(
            (candidate) =>
              candidate.imageSrcset.includes(image.getAttribute("src")?.split("&w=")[0])
          );
          return {
            viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
            image: {
              currentSrc: image.currentSrc,
              srcSet: image.srcset,
              sizes: image.sizes,
              loading: image.loading,
              fetchPriority: image.fetchPriority,
              resourceStart: resource?.startTime ?? null,
              responseEnd: resource?.responseEnd ?? null,
              resourceInitiatorType: resource?.initiatorType ?? null,
            },
            preload: preload
              ? {
                  media: preload.media,
                  mediaMatches: matchMedia(preload.media).matches,
                  imageSrcSet: preload.imageSrcset,
                  imageSizes: preload.imageSizes,
                }
              : null,
            lcp: globalThis.__perf043Lcp.at(-1) || null,
          };
        }, route.targetAlt);

        const targetRequests = [...requests.values()];
        const run = {
          runId: `${variant}-dpr${dpr}-${route.id}-${repetition}`,
          variant,
          route: route.id,
          path: route.path,
          repetition,
          requestedDpr: dpr,
          document: {
            decodedBodyBytes: documentBody.byteLength,
            contentEncoding: response.headers()["content-encoding"] || "identity",
            requestId: documentRequestId || null,
            networkEncodedBytes: documentEncodedDataLength,
          },
          ...observed,
          image: {
            ...observed.image,
            resourceStart: round(observed.image.resourceStart),
            responseEnd: round(observed.image.responseEnd),
            requestCount: targetRequests.length,
            requestedUrls: targetRequests.map((request) => request.url),
            initialPriorities: targetRequests.map((request) => request.initialPriority),
            initiatorTypes: targetRequests.map((request) => request.initiatorType),
            networkEncodedBytes: targetRequests.map((request) => request.encodedDataLength),
          },
          lcp: observed.lcp ? { ...observed.lcp, startTime: round(observed.lcp.startTime) } : null,
        };
        runs.push(run);
        console.log(
          `${run.runId}: requests=${run.image.requestCount}, initiator=${run.image.resourceInitiatorType}, ` +
            `start=${run.image.resourceStart}, lcp=${run.lcp?.startTime ?? "none"}, ` +
            `preload=${run.preload?.mediaMatches ?? "none"}`
        );
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const output = {
  experiment: "PERF-043 responsive-preload metadata browser matrix",
  generatedAt: new Date().toISOString(),
  variant,
  baseUrl,
  transport,
  method: {
    viewport: "1440x1000 desktop",
    dprs,
    repetitions: `DPR 1/2: ${standardRepetitions}; boundary probes: ${probeRepetitions}`,
    cache: "Fresh isolated context with browser and CDP cache disabled per navigation",
  },
  runs,
};
const outputPath = path.join(experimentRoot, "results", `perf043-${variant}-browser.json`);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
