import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  classifyRequest,
  missingPaths,
  normalizeHeaders,
  requestedPaths,
  slugOrder,
  summarizeRequests,
} from "./protocol.mjs";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromFixture = createRequire(path.join(experimentRoot, "package.json"));
const puppeteer = requireFromFixture("puppeteer-core");
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const origin = process.env.PERF046_ORIGIN || "http://127.0.0.1:3146";
const label = process.env.PERF046_LABEL || "stable-legacy-webpack";
const cacheMode = process.env.PERF046_CACHE_MODE || "legacy";
const bundler = process.env.PERF046_BUNDLER || "webpack";
const profile = process.env.PERF046_PROFILE || "local";
const repetitions = Number(process.env.PERF046_REPETITIONS || 3);
const outputName = process.env.PERF046_OUTPUT || `${label}.json`;
const nextPackagePath = process.env.PERF046_NEXT_PACKAGE || "next/package.json";
const nextVersion = createRequire(path.join(experimentRoot, "package.json"))(
  nextPackagePath
).version;

const matrices = {
  legacy: [
    ...[1, 4, 5, 7].map((count) => ({ routeKind: "static", scenario: "viewport-auto", count })),
    { routeKind: "static", scenario: "viewport-full", count: 5 },
    { routeKind: "static", scenario: "disabled", count: 7 },
    { routeKind: "static", scenario: "imperative", count: 5 },
  ],
  partial: [
    ...[4, 5, 7].map((count) => ({ routeKind: "partial", scenario: "imperative", count })),
    ...[4, 5, 7].map((count) => ({
      routeKind: "partial",
      scenario: "imperative-full",
      count,
    })),
    { routeKind: "partial", scenario: "staggered", count: 5 },
    { routeKind: "partial", scenario: "viewport-full", count: 5 },
    { routeKind: "partial", scenario: "disabled", count: 7 },
    { routeKind: "static", scenario: "viewport-auto", count: 5 },
  ],
};

if (!matrices[cacheMode]) throw new Error(`Unknown PERF046_CACHE_MODE: ${cacheMode}`);
if (!new Set(["local", "controlled"]).has(profile)) {
  throw new Error(`Unknown PERF046_PROFILE: ${profile}`);
}
const network =
  profile === "controlled"
    ? {
        latencyMs: 150,
        downloadBytesPerSecond: 200_000,
        uploadBytesPerSecond: 93_750,
      }
    : null;
const matrix =
  process.env.PERF046_FOCUS === "full-boundary"
    ? matrices[cacheMode].filter((row) => row.scenario === "imperative-full")
    : process.env.PERF046_FOCUS === "auto-boundary"
      ? matrices[cacheMode].filter((row) => row.scenario === "imperative")
      : matrices[cacheMode];

const round = (value, places = 3) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const digest = (value) => createHash("sha256").update(value).digest("hex");

async function waitForQuiet(
  state,
  { minimumWaitMs = 500, quietMs = 350, timeoutMs = 15_000 } = {}
) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const elapsed = performance.now() - startedAt;
    if (
      elapsed >= minimumWaitMs &&
      state.pending.size === 0 &&
      Date.now() - state.lastInterestingAt >= quietMs
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Network did not become quiet; pending=${[...state.pending].join(",")}`);
}

async function measure(browser, definition, repetition) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();
  const requests = new Map();
  const bodyTasks = [];
  const pageErrors = [];
  const state = { pending: new Set(), lastInterestingAt: Date.now() };
  let navigationTimestamp = null;
  let stage = "prefetch";

  const isInteresting = (url) => {
    const parsed = new URL(url);
    return (
      parsed.searchParams.has("_rsc") &&
      (parsed.pathname.startsWith("/static/") || parsed.pathname.startsWith("/partial/"))
    );
  };

  const mergeRequestHeaders = (request, rawHeaders) => {
    const headers = normalizeHeaders(rawHeaders);
    request.routerPrefetch = headers["next-router-prefetch"] || request.routerPrefetch || null;
    request.segmentPrefetch =
      headers["next-router-segment-prefetch"] || request.segmentPrefetch || null;
    request.routerStateTree = headers["next-router-state-tree"] || request.routerStateTree || null;
    request.nextUrl = headers["next-url"] || request.nextUrl || null;
    request.accept = headers.accept || request.accept || null;
  };

  try {
    await page.setViewport({ width: 1_440, height: 1_000, deviceScaleFactor: 1 });
    await page.setCacheEnabled(false);
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await cdp.send("Network.enable", {
      maxTotalBufferSize: 20_000_000,
      maxResourceBufferSize: 2_000_000,
    });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (network) {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: network.latencyMs,
        downloadThroughput: network.downloadBytesPerSecond,
        uploadThroughput: network.uploadBytesPerSecond,
      });
    }

    cdp.on("Network.requestWillBeSent", (event) => {
      if (event.type === "Document" && navigationTimestamp === null) {
        navigationTimestamp = event.timestamp;
      }
      if (!isInteresting(event.request.url)) return;
      const request = {
        requestId: event.requestId,
        url: event.request.url,
        stage,
        type: event.type,
        initialPriority: event.request.initialPriority || null,
        initiatorType: event.initiator?.type || null,
        routerPrefetch: null,
        segmentPrefetch: null,
        routerStateTree: null,
        nextUrl: null,
        accept: null,
        startMs: navigationTimestamp
          ? round((event.timestamp - navigationTimestamp) * 1_000)
          : null,
        status: null,
        responseHeaders: {},
        fromDiskCache: false,
        fromPrefetchCache: false,
        encodedDataLength: null,
        bodyBytes: null,
        bodySha256: null,
        bodyError: null,
        finishedMs: null,
        failed: null,
      };
      mergeRequestHeaders(request, event.request.headers);
      requests.set(event.requestId, request);
      state.pending.add(event.requestId);
      state.lastInterestingAt = Date.now();
    });

    cdp.on("Network.requestWillBeSentExtraInfo", (event) => {
      const request = requests.get(event.requestId);
      if (request) mergeRequestHeaders(request, event.headers);
    });

    cdp.on("Network.responseReceived", (event) => {
      const request = requests.get(event.requestId);
      if (!request) return;
      const headers = normalizeHeaders(event.response.headers);
      request.status = event.response.status;
      request.responseHeaders = {
        cacheControl: headers["cache-control"] || null,
        contentType: headers["content-type"] || null,
        vary: headers.vary || null,
        xNextjsCache: headers["x-nextjs-cache"] || null,
      };
      request.fromDiskCache = event.response.fromDiskCache;
      request.fromPrefetchCache = event.response.fromPrefetchCache;
    });

    cdp.on("Network.loadingFinished", (event) => {
      const request = requests.get(event.requestId);
      if (!request) return;
      request.encodedDataLength = event.encodedDataLength;
      request.finishedMs = navigationTimestamp
        ? round((event.timestamp - navigationTimestamp) * 1_000)
        : null;
      state.pending.delete(event.requestId);
      state.lastInterestingAt = Date.now();
      bodyTasks.push(
        cdp
          .send("Network.getResponseBody", { requestId: event.requestId })
          .then(({ body, base64Encoded }) => {
            const bytes = Buffer.from(body, base64Encoded ? "base64" : "utf8");
            request.bodyBytes = bytes.length;
            request.bodySha256 = digest(bytes);
          })
          .catch((error) => {
            request.bodyError = error.message;
          })
      );
    });

    cdp.on("Network.loadingFailed", (event) => {
      const request = requests.get(event.requestId);
      if (!request) return;
      request.failed = event.errorText;
      state.pending.delete(event.requestId);
      state.lastInterestingAt = Date.now();
    });

    const url = new URL("/", origin);
    url.searchParams.set("route", definition.routeKind);
    url.searchParams.set("scenario", definition.scenario);
    url.searchParams.set("count", String(definition.count));
    url.searchParams.set("run", `${label}-${repetition}`);
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => document.querySelector('[data-hydrated="true"]'), {
      timeout: 30_000,
    });

    const isTriggered = new Set(["imperative", "imperative-full", "staggered"]).has(
      definition.scenario
    );
    if (isTriggered) {
      stage = "prefetch";
      await page.click("[data-prefetch-trigger]");
      await waitForQuiet(state, {
        minimumWaitMs: definition.scenario === "staggered" ? definition.count * 75 + 500 : 750,
      });
    } else {
      await waitForQuiet(state, {
        minimumWaitMs: definition.scenario === "disabled" ? 750 : 1_000,
      });
    }

    const prefetchRequests = [...requests.values()].filter(
      (request) => request.stage === "prefetch"
    );
    const treePaths = requestedPaths(prefetchRequests, "prefetch", "route-tree");
    const prefetchPaths = new Set(prefetchRequests.map((request) => new URL(request.url).pathname));
    const missingTreePaths = missingPaths(definition.routeKind, definition.count, treePaths);
    const missingPrefetchPaths = missingPaths(
      definition.routeKind,
      definition.count,
      prefetchPaths
    );
    let retry = null;
    let navigation = null;

    if (isTriggered) {
      const targetPath =
        missingPrefetchPaths[0] ||
        missingTreePaths[0] ||
        `/${definition.routeKind}/${slugOrder[0]}`;
      const targetSlug = targetPath.split("/").at(-1);
      stage = "retry";
      const retryStartedAt = performance.now();
      await page.evaluate(({ slug, full }) => globalThis.__perf046Prefetch(slug, full), {
        slug: targetSlug,
        full: definition.scenario === "imperative-full",
      });
      await waitForQuiet(state, { minimumWaitMs: 600 });
      retry = {
        targetPath,
        elapsedMs: round(performance.now() - retryStartedAt),
        requests: summarizeRequests([...requests.values()], "retry"),
      };

      stage = "navigation";
      const clickStartedAt = performance.now();
      await page.click(`[data-prefetch-link="${targetSlug}"]`);
      await page.waitForFunction(
        (expectedSlug) =>
          location.pathname.endsWith(`/${expectedSlug}`) &&
          document.querySelector("[data-slug-content]")?.textContent === expectedSlug,
        { timeout: 30_000 },
        targetSlug
      );
      const clickToContentMs = round(performance.now() - clickStartedAt);
      await waitForQuiet(state, { minimumWaitMs: 350 });
      navigation = await page.evaluate(
        ({ targetPath, targetSlug, clickToContentMs }) => ({
          targetPath,
          targetSlug,
          clickToContentMs,
          finalPath: location.pathname,
          renderedSlug: document.querySelector("[data-slug-content]")?.textContent || null,
          dynamicContentRendered: Boolean(document.querySelector("[data-dynamic-content]")),
        }),
        { targetPath, targetSlug, clickToContentMs }
      );
      navigation.requests = summarizeRequests([...requests.values()], "navigation");
    }

    await Promise.allSettled(bodyTasks);
    const requestList = [...requests.values()].map((request) => ({
      ...request,
      classification: classifyRequest(request),
      routerStateTreeBytes: request.routerStateTree
        ? Buffer.byteLength(request.routerStateTree)
        : 0,
      routerStateTreeSha256: request.routerStateTree ? digest(request.routerStateTree) : null,
    }));

    return {
      ...definition,
      repetition,
      pageErrors,
      prefetch: summarizeRequests(requestList, "prefetch"),
      prefetchPaths: [...prefetchPaths].sort(),
      prefetchTreePaths: [...requestedPaths(requestList, "prefetch", "route-tree")].sort(),
      missingTreePaths,
      missingPrefetchPaths,
      retry,
      navigation,
      requests: requestList,
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
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const definitions = repetition % 2 ? matrix : [...matrix].reverse();
    for (const definition of definitions) {
      const run = await measure(browser, definition, repetition);
      runs.push(run);
      console.log(
        `${label}/${definition.routeKind}/${definition.scenario}/${definition.count}/${repetition}: ` +
          `prefetch=${run.prefetch.total}, tree=${run.prefetch.routeTree}, ` +
          `segment=${run.prefetch.segment}, full=${run.prefetch.fullPrefetch}, ` +
          `missingTree=${run.missingTreePaths.length}, ` +
          `retry=${run.retry?.requests.total ?? "-"}, nav=${run.navigation?.requests.total ?? "-"}`
      );
    }
  }
} finally {
  await browser.close();
}

const output = {
  experiment: "PERF-046 Next.js sibling prefetch protocol and starvation",
  generatedAt: new Date().toISOString(),
  label,
  nextVersion,
  cacheMode,
  bundler,
  profile,
  origin,
  buildId: readFileSync(
    path.join(experimentRoot, process.env.NEXT_DIST_DIR || `.next-${cacheMode}`, "BUILD_ID"),
    "utf8"
  ).trim(),
  method: {
    repetitions,
    viewport: { width: 1_440, height: 1_000, deviceScaleFactor: 1 },
    cache: "Fresh browser context with browser and CDP cache disabled",
    network,
    schedulerBoundaryCounts: [4, 5, 7],
    capturedRequestHeaders: [
      "Next-Router-Prefetch",
      "Next-Router-Segment-Prefetch",
      "Next-Router-State-Tree",
      "Next-Url",
    ],
  },
  runs,
};

const outputPath = path.join(experimentRoot, "results", outputName);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
