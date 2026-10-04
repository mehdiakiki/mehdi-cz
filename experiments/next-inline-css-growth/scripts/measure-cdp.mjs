#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.env.PERF048_MODE || "reload";
const outputPath = path.join(
  experimentRoot,
  mode === "journey" ? "results/perf048-journey.json" : "results/perf048-measurement.json"
);
const debuggerUrl = process.env.PERF048_DEBUGGER_URL || "http://127.0.0.1:9224";
const repetitions = Number.parseInt(process.env.PERF048_REPETITIONS || "5", 10);

const variants = [
  { id: "external", origin: process.env.PERF048_EXTERNAL_ORIGIN || "http://127.0.0.1:3121" },
  { id: "inline", origin: process.env.PERF048_INLINE_ORIGIN || "http://127.0.0.1:3122" },
];

const routes = [
  { id: "home", pathname: "/" },
  { id: "article", pathname: "/blog/load-balancer-sticky-sessions-course" },
];

const profile = {
  viewport: { width: 390, height: 844, deviceScaleFactor: 2.75, mobile: true },
  cpuThrottlingRate: 4,
  network: {
    label: "Slow 4G",
    latencyMs: 150,
    downloadBitsPerSecond: 1_600_000,
    uploadBitsPerSecond: 750_000,
  },
};

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener("message", (event) => this.onMessage(JSON.parse(event.data)));
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  onMessage(message) {
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result);
      return;
    }

    for (const listener of this.listeners) listener(message);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  waitFor(method, sessionId, timeoutMs = 120_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const listener = (message) => {
        if (message.method !== method || message.sessionId !== sessionId) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(message.params);
      };
      this.listeners.add(listener);
    });
  }

  close() {
    this.socket.close();
  }
}

const observerSource = `(() => {
  window.__perf048 = { lcp: 0, cls: 0, longTasks: [] };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) window.__perf048.lcp = entries.at(-1).startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__perf048.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf048.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {}
})();`;

const metricExpression = `(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const resources = performance.getEntriesByType("resource");
  const css = resources.filter((entry) => entry.initiatorType === "link" && /\\.css(?:\\?|$)/.test(entry.name));
  const scripts = resources.filter((entry) => entry.initiatorType === "script" || /\\.js(?:\\?|$)/.test(entry.name));
  const paint = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
  const aggregate = (entries) => ({
    count: entries.length,
    transferBytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0),
    encodedBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
    decodedBytes: entries.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
  });
  return {
    title: document.title,
    pathname: location.pathname,
    visibilityState: document.visibilityState,
    lcpMs: window.__perf048?.lcp || 0,
    cls: window.__perf048?.cls || 0,
    fcpMs: paint["first-contentful-paint"] || 0,
    longTasks: window.__perf048?.longTasks || [],
    navigation: nav ? {
      responseStartMs: nav.responseStart,
      domContentLoadedMs: nav.domContentLoadedEventEnd,
      loadMs: nav.loadEventEnd,
      transferBytes: nav.transferSize,
      encodedBytes: nav.encodedBodySize,
      decodedBytes: nav.decodedBodySize,
    } : null,
    css: aggregate(css),
    scripts: aggregate(scripts),
    allResources: aggregate(resources),
  };
})()`;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function configure(client, sessionId) {
  await Promise.all([
    client.send("Page.enable", {}, sessionId),
    client.send("Runtime.enable", {}, sessionId),
    client.send("Network.enable", {}, sessionId),
    client.send("Page.setLifecycleEventsEnabled", { enabled: true }, sessionId),
  ]);
  await client.send("Emulation.setDeviceMetricsOverride", profile.viewport, sessionId);
  await client.send(
    "Emulation.setTouchEmulationEnabled",
    { enabled: true, maxTouchPoints: 5 },
    sessionId
  );
  await client.send(
    "Emulation.setCPUThrottlingRate",
    { rate: profile.cpuThrottlingRate },
    sessionId
  );
  await client.send(
    "Network.emulateNetworkConditions",
    {
      offline: false,
      latency: profile.network.latencyMs,
      downloadThroughput: profile.network.downloadBitsPerSecond / 8,
      uploadThroughput: profile.network.uploadBitsPerSecond / 8,
      connectionType: "cellular4g",
    },
    sessionId
  );
  await client.send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-color-scheme", value: "light" }] },
    sessionId
  );
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: observerSource }, sessionId);
}

async function navigateAndMeasure(client, sessionId, url, type) {
  const loaded = client.waitFor("Page.loadEventFired", sessionId);
  if (type === "cold") {
    await client.send("Page.navigate", { url }, sessionId);
  } else {
    await client.send("Page.reload", { ignoreCache: false }, sessionId);
  }
  await loaded;
  await sleep(1_500);
  const evaluated = await client.send(
    "Runtime.evaluate",
    { expression: metricExpression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (evaluated.exceptionDetails)
    throw new Error(evaluated.exceptionDetails.text || "Metric evaluation failed");
  return evaluated.result.value;
}

async function measurePair(client, repetition, route, variant) {
  const { browserContextId } = await client.send("Target.createBrowserContext");
  try {
    const { targetId } = await client.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
    await configure(client, sessionId);
    const url = new URL(route.pathname, variant.origin).href;
    const cold = await navigateAndMeasure(client, sessionId, url, "cold");
    const warm = await navigateAndMeasure(client, sessionId, url, "warm");
    return [
      {
        repetition,
        route: route.id,
        pathname: route.pathname,
        variant: variant.id,
        cacheState: "cold",
        ...cold,
      },
      {
        repetition,
        route: route.id,
        pathname: route.pathname,
        variant: variant.id,
        cacheState: "warm",
        ...warm,
      },
    ];
  } finally {
    await client.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  }
}

async function measureJourney(client, repetition, fromRoute, toRoute, variant) {
  const { browserContextId } = await client.send("Target.createBrowserContext");
  try {
    const { targetId } = await client.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
    await configure(client, sessionId);
    await navigateAndMeasure(
      client,
      sessionId,
      new URL(fromRoute.pathname, variant.origin).href,
      "cold"
    );
    const target = await navigateAndMeasure(
      client,
      sessionId,
      new URL(toRoute.pathname, variant.origin).href,
      "cold"
    );
    return {
      repetition,
      route: toRoute.id,
      pathname: toRoute.pathname,
      sourceRoute: fromRoute.id,
      variant: variant.id,
      cacheState: "cross-route",
      ...target,
    };
  } finally {
    await client.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  }
}

async function writeProgress(rows) {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        experiment: "PERF-048",
        capturedAt: new Date().toISOString(),
        methodology:
          mode === "journey"
            ? "fresh isolated context per variant/direction; prime one route, then navigate to the other with shared browser cache"
            : "fresh isolated context per variant/route pair; cold navigation followed by warm reload",
        mode,
        runtime: {
          node: process.version,
          browser: version.Browser,
          protocol: version["Protocol-Version"],
        },
        profile,
        repetitions,
        variants,
        routes,
        rows,
      },
      null,
      2
    )}\n`
  );
}

const version = await fetch(`${debuggerUrl}/json/version`).then((response) => response.json());
const client = new CdpClient(version.webSocketDebuggerUrl);
await client.connect();

const rows = [];
try {
  if (mode === "journey") {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      const order = repetition % 2 === 1 ? variants : [...variants].reverse();
      for (const [fromRoute, toRoute] of [
        [routes[0], routes[1]],
        [routes[1], routes[0]],
      ]) {
        for (const variant of order) {
          rows.push(await measureJourney(client, repetition, fromRoute, toRoute, variant));
          await writeProgress(rows);
          console.log(
            `saved repetition=${repetition} journey=${fromRoute.id}->${toRoute.id} variant=${variant.id}`
          );
        }
      }
    }
  } else {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      const order = repetition % 2 === 1 ? variants : [...variants].reverse();
      for (const route of routes) {
        for (const variant of order) {
          rows.push(...(await measurePair(client, repetition, route, variant)));
          await writeProgress(rows);
          console.log(`saved repetition=${repetition} route=${route.id} variant=${variant.id}`);
        }
      }
    }
  }
} finally {
  client.close();
}

console.log(`wrote ${rows.length} rows to ${outputPath}`);
