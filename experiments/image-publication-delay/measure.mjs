import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routes, variants as allVariants } from "./fixture.mjs";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const requireFromFixture = createRequire(
  path.join(experimentRoot, "../static-content-tier/package.json")
);
const puppeteer = requireFromFixture("puppeteer-core");
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const baseUrl = process.env.PERF044_BASE_URL || "http://127.0.0.1:3122";
const repetitions = Number(process.env.PERF044_REPETITIONS || 5);
const traceRepetitions = Number(process.env.PERF044_TRACE_REPETITIONS || 2);
const traceRoot = process.env.PERF044_TRACE_ROOT || "/tmp/perf044-traces";
const outputName = process.env.PERF044_OUTPUT || "perf044-measurement.json";
const selectedProfiles = (process.env.PERF044_PROFILES || "local,controlled")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const selectedVariants = (process.env.PERF044_VARIANTS || allVariants.join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const profiles = {
  local: { id: "local", network: null },
  controlled: {
    id: "controlled",
    network: {
      latencyMs: 150,
      downloadBytesPerSecond: 200_000,
      uploadBytesPerSecond: 93_750,
    },
  },
};

for (const profile of selectedProfiles) {
  if (!profiles[profile]) throw new Error(`Unknown PERF-044 profile: ${profile}`);
}
for (const variant of selectedVariants) {
  if (!allVariants.includes(variant)) throw new Error(`Unknown PERF-044 variant: ${variant}`);
}

const traceCategories = [
  "-*",
  "blink.user_timing",
  "blink.console",
  "cc",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-devtools.timeline.stack",
  "gpu",
  "latencyInfo",
  "loading",
  "renderer.scheduler",
  "toplevel",
  "v8.execute",
];

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

function rotate(values, offset) {
  const index = offset % values.length;
  return [...values.slice(index), ...values.slice(0, index)];
}

function sha256(filename) {
  return createHash("sha256").update(readFileSync(filename)).digest("hex");
}

async function measureRun(browser, definition) {
  const { profile, route, variant, repetition, traceEnabled } = definition;
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();
  const requests = new Map();
  let documentRequestId;
  let documentEncodedDataLength = null;
  let tracePath = null;

  try {
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.setCacheEnabled(false);
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
      if (event.type === "Document" && event.request.url.includes(route.path)) {
        documentRequestId = event.requestId;
      }
      requests.set(event.requestId, {
        url: event.request.url,
        type: event.type,
        initialPriority: event.request.initialPriority || null,
        initiatorType: event.initiator?.type || null,
        encodedDataLength: null,
      });
    });
    cdp.on("Network.loadingFinished", (event) => {
      if (event.requestId === documentRequestId)
        documentEncodedDataLength = event.encodedDataLength;
      const request = requests.get(event.requestId);
      if (request) request.encodedDataLength = event.encodedDataLength;
    });

    await page.evaluateOnNewDocument((targetAlt) => {
      const state = {
        lcp: [],
        shifts: [],
        longTasks: [],
        paints: [],
        target: { domSeen: null, firstResize: null, load: null, loadRaf: null },
      };
      globalThis.__perf044 = state;

      new PerformanceObserver((list) => {
        state.lcp.push(
          ...list.getEntries().map((entry) => ({
            startTime: entry.startTime,
            renderTime: entry.renderTime,
            loadTime: entry.loadTime,
            size: entry.size,
            tagName: entry.element?.tagName || "",
            alt: entry.element?.getAttribute?.("alt") || "",
            url: entry.url || "",
          }))
        );
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        state.shifts.push(
          ...list.getEntries().map((entry) => ({
            startTime: entry.startTime,
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
          }))
        );
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        state.longTasks.push(
          ...list.getEntries().map((entry) => ({
            startTime: entry.startTime,
            duration: entry.duration,
          }))
        );
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((list) => {
        state.paints.push(
          ...list.getEntries().map((entry) => ({ name: entry.name, startTime: entry.startTime }))
        );
      }).observe({ type: "paint", buffered: true });

      function attachTarget() {
        const image = [...document.images].find((candidate) => candidate.alt === targetAlt);
        if (!image || state.target.domSeen !== null) return Boolean(image);
        state.target.domSeen = performance.now();
        const resize = new ResizeObserver(() => {
          if (state.target.firstResize === null) state.target.firstResize = performance.now();
          resize.disconnect();
        });
        resize.observe(image);
        return true;
      }

      const mutations = new MutationObserver(() => {
        if (attachTarget()) mutations.disconnect();
      });
      mutations.observe(document, { childList: true, subtree: true });
      document.addEventListener(
        "load",
        (event) => {
          if (!(event.target instanceof HTMLImageElement) || event.target.alt !== targetAlt) return;
          state.target.load = performance.now();
          requestAnimationFrame(() => {
            state.target.loadRaf = performance.now();
          });
        },
        true
      );
    }, route.targetAlt);

    const runId = `${profile.id}-${route.id}-${variant}-${traceEnabled ? "trace" : "timing"}-${repetition}`;
    if (traceEnabled) {
      mkdirSync(traceRoot, { recursive: true });
      tracePath = path.join(traceRoot, `${runId}.json`);
      await page.tracing.start({
        path: tracePath,
        screenshots: false,
        categories: traceCategories,
      });
    }

    const url = new URL(route.path, baseUrl);
    url.searchParams.set("perf044_variant", variant);
    url.searchParams.set("perf044_run", runId);
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (!response?.ok()) throw new Error(`${url.href} returned ${response?.status()}`);
    await page.waitForFunction(
      (targetAlt) => {
        const image = [...document.images].find((candidate) => candidate.alt === targetAlt);
        const state = globalThis.__perf044;
        return image?.complete && state?.lcp?.some((entry) => entry.alt === targetAlt);
      },
      { timeout: 30_000 },
      route.targetAlt
    );
    await new Promise((resolve) => setTimeout(resolve, 750));

    const observed = await page.evaluate((targetAlt) => {
      const image = [...document.images].find((candidate) => candidate.alt === targetAlt);
      const resource = performance
        .getEntriesByType("resource")
        .find((entry) => entry.name === image.currentSrc);
      const navigation = performance.getEntriesByType("navigation")[0];
      const targetLcp = globalThis.__perf044.lcp.filter((entry) => entry.alt === targetAlt).at(-1);
      const rect = image.getBoundingClientRect();
      const css = performance
        .getEntriesByType("resource")
        .filter(
          (entry) => entry.initiatorType === "link" && new URL(entry.name).pathname.endsWith(".css")
        );
      const shifts = globalThis.__perf044.shifts.filter((entry) => !entry.hadRecentInput);
      const renderDelayStart = resource?.responseEnd ?? 0;
      const renderDelayEnd = targetLcp?.startTime ?? 0;
      const longTasksAfterImage = globalThis.__perf044.longTasks.filter(
        (entry) =>
          entry.startTime < renderDelayEnd && entry.startTime + entry.duration > renderDelayStart
      );
      return {
        image: {
          currentSrc: image.currentSrc,
          srcSet: image.srcset,
          sizes: image.sizes,
          loading: image.loading,
          fetchPriority: image.fetchPriority,
          decoding: image.decoding,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          resource: resource
            ? {
                startTime: resource.startTime,
                responseStart: resource.responseStart,
                responseEnd: resource.responseEnd,
                duration: resource.duration,
                transferSize: resource.transferSize,
                encodedBodySize: resource.encodedBodySize,
                decodedBodySize: resource.decodedBodySize,
                initiatorType: resource.initiatorType,
              }
            : null,
        },
        lcp: targetLcp || null,
        targetLifecycle: globalThis.__perf044.target,
        paints: globalThis.__perf044.paints,
        cls: shifts.reduce((total, entry) => total + entry.value, 0),
        longTasksAfterImage: {
          count: longTasksAfterImage.length,
          totalDuration: longTasksAfterImage.reduce((total, entry) => total + entry.duration, 0),
        },
        css: {
          count: css.length,
          lastResponseEnd: Math.max(0, ...css.map((entry) => entry.responseEnd)),
          entries: css.map((entry) => ({
            name: entry.name,
            startTime: entry.startTime,
            responseEnd: entry.responseEnd,
            transferSize: entry.transferSize,
          })),
        },
        navigation: {
          responseStart: navigation.responseStart,
          responseEnd: navigation.responseEnd,
          domInteractive: navigation.domInteractive,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd,
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize,
        },
        document: {
          elements: document.querySelectorAll("*").length,
          scripts: document.scripts.length,
          externalScripts: [...document.scripts].filter((script) => script.src).length,
          inlineFlightBytes: [...document.scripts]
            .filter((script) => script.textContent.includes("self.__next_f"))
            .reduce((total, script) => total + script.textContent.length, 0),
          images: document.images.length,
        },
        targetHeading: document.querySelector("article header h1")?.textContent?.trim() || null,
      };
    }, route.targetAlt);

    if (traceEnabled) await page.tracing.stop();

    const targetRequests = [...requests.values()].filter(
      (request) => request.type === "Image" && sourceForRequest(request.url) === route.source
    );
    const scriptRequests = [...requests.values()].filter((request) => request.type === "Script");
    const run = {
      runId,
      profile: profile.id,
      transport: profile.network,
      route: route.id,
      path: route.path,
      targetAlt: route.targetAlt,
      variant,
      repetition,
      traceEnabled,
      documentNetwork: {
        requestId: documentRequestId || null,
        encodedDataLength: documentEncodedDataLength,
      },
      networkScriptRequests: scriptRequests.length,
      ...observed,
      image: {
        ...observed.image,
        resource: observed.image.resource
          ? Object.fromEntries(
              Object.entries(observed.image.resource).map(([key, value]) => [
                key,
                typeof value === "number" ? round(value) : value,
              ])
            )
          : null,
        requestCount: targetRequests.length,
        requestUrls: targetRequests.map((request) => request.url),
        initialPriorities: targetRequests.map((request) => request.initialPriority),
        networkInitiators: targetRequests.map((request) => request.initiatorType),
        networkEncodedBytes: targetRequests.map((request) => request.encodedDataLength),
      },
      lcp: observed.lcp
        ? Object.fromEntries(
            Object.entries(observed.lcp).map(([key, value]) => [
              key,
              typeof value === "number" ? round(value) : value,
            ])
          )
        : null,
      traceArtifact: tracePath
        ? { path: tracePath, bytes: statSync(tracePath).size, sha256: sha256(tracePath) }
        : null,
    };
    console.log(
      `${runId}: LCP=${run.lcp?.startTime ?? "none"} ms, ` +
        `imageEnd=${run.image.resource?.responseEnd ?? "none"} ms, ` +
        `delay=${round(run.lcp?.startTime - run.image.resource?.responseEnd)} ms, ` +
        `requests=${run.image.requestCount}, CLS=${round(run.cls)}`
    );
    return run;
  } finally {
    if (traceEnabled && tracePath) {
      try {
        await page.tracing.stop();
      } catch {}
    }
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
  for (const profileId of selectedProfiles) {
    const profile = profiles[profileId];
    for (const traceEnabled of [false, true]) {
      const count = traceEnabled ? traceRepetitions : repetitions;
      for (let repetition = 1; repetition <= count; repetition += 1) {
        const routeOrder = repetition % 2 ? routes : [...routes].reverse();
        const variantOrder = rotate(selectedVariants, repetition - 1);
        for (const variant of variantOrder) {
          for (const route of routeOrder) {
            runs.push(
              await measureRun(browser, { profile, route, variant, repetition, traceEnabled })
            );
          }
        }
      }
    }
  }
} finally {
  await browser.close();
}

const output = {
  experiment: "PERF-044 image publication delay",
  generatedAt: new Date().toISOString(),
  baseUrl,
  method: {
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
    cache: "Fresh isolated browser context with browser and CDP cache disabled per navigation",
    profiles: selectedProfiles.map((id) => profiles[id]),
    variants: selectedVariants,
    repetitions,
    traceRepetitions,
    traceCategories,
    ordering: "Routes alternate and variant order rotates per repetition",
  },
  runs,
};
const outputPath = path.join(experimentRoot, "results", outputName);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
