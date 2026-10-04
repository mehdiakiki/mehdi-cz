#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(experimentRoot, "results/measurement.json");
const debuggerUrl = process.env.PERF049_DEBUGGER_URL || "http://127.0.0.1:9225";
const repetitions = Number.parseInt(process.env.PERF049_REPETITIONS || "5", 10);
const variants = [
  { id: "before", origin: process.env.PERF049_BEFORE_ORIGIN || "http://127.0.0.1:3131" },
  { id: "after", origin: process.env.PERF049_AFTER_ORIGIN || "http://127.0.0.1:3132" },
];
const routes = [
  { id: "neither", pathname: "/blog/async-rust-libraries" },
  { id: "code", pathname: "/blog/load-balancer-sticky-sessions-course" },
  { id: "math", pathname: "/blog/dissecting-bash-script", scrollTo: ".prose .katex" },
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

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const observerSource = `(() => {
  window.__perf049 = { lcp: 0, cls: 0, shifts: [] };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) window.__perf049.lcp = entries.at(-1).startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__perf049.cls += entry.value;
        window.__perf049.shifts.push({ startTime: entry.startTime, value: entry.value });
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
})();`;

const metricExpression = `(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const paint = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
  const css = performance.getEntriesByType("resource")
    .filter((entry) => /\\.css(?:\\?|$)/.test(entry.name))
    .map((entry) => ({
      name: new URL(entry.name).pathname,
      startTime: entry.startTime,
      responseEnd: entry.responseEnd,
      duration: entry.duration,
      transferBytes: entry.transferSize,
      encodedBytes: entry.encodedBodySize,
      decodedBytes: entry.decodedBodySize,
      renderBlockingStatus: entry.renderBlockingStatus || null,
    }));
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => ({
    href: new URL(link.href).pathname,
    media: link.media || "all",
    marker: link.dataset.articleStyle || null,
  }));
  const token = document.querySelector(".prose .token");
  const katex = document.querySelector(".prose .katex");
  const pre = document.querySelector(".prose pre");
  const rect = (element) => element ? {
    top: Math.round(element.getBoundingClientRect().top + scrollY),
    width: Math.round(element.getBoundingClientRect().width),
    height: Math.round(element.getBoundingClientRect().height),
  } : null;
  return {
    lcpMs: window.__perf049?.lcp || 0,
    cls: window.__perf049?.cls || 0,
    shifts: window.__perf049?.shifts || [],
    fcpMs: paint["first-contentful-paint"] || 0,
    loadMs: nav?.loadEventEnd || 0,
    navigationTransferBytes: nav?.transferSize || 0,
    css,
    links,
    scrollY,
    pre: rect(pre),
    katex: rect(katex),
    tokenColor: token ? getComputedStyle(token).color : null,
    katexFont: katex ? getComputedStyle(katex).fontFamily : null,
  };
})()`;

async function configure(client, sessionId) {
  await Promise.all([
    client.send("Page.enable", {}, sessionId),
    client.send("Runtime.enable", {}, sessionId),
    client.send("Network.enable", {}, sessionId),
  ]);
  await client.send("Emulation.setDeviceMetricsOverride", profile.viewport, sessionId);
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
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: observerSource }, sessionId);
}

async function evaluate(client, sessionId) {
  const result = await client.send(
    "Runtime.evaluate",
    { expression: metricExpression, returnByValue: true },
    sessionId
  );
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function measure(client, repetition, route, variant) {
  const { browserContextId } = await client.send("Target.createBrowserContext");
  try {
    const { targetId } = await client.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
    await configure(client, sessionId);
    const loaded = client.waitFor("Page.loadEventFired", sessionId);
    await client.send(
      "Page.navigate",
      { url: new URL(route.pathname, variant.origin).href },
      sessionId
    );
    await loaded;
    await sleep(1_200);
    const initial = await evaluate(client, sessionId);
    let promoted = null;
    if (route.scrollTo) {
      await client.send(
        "Runtime.evaluate",
        {
          expression: `(() => { document.documentElement.style.scrollBehavior = "auto"; document.querySelector(${JSON.stringify(route.scrollTo)})?.scrollIntoView({ block: "center" }); })()`,
        },
        sessionId
      );
      await sleep(250);
      promoted = await evaluate(client, sessionId);
    }
    return { repetition, route: route.id, variant: variant.id, initial, promoted };
  } finally {
    await client.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  }
}

const version = await fetch(`${debuggerUrl}/json/version`).then((response) => response.json());
const client = new CdpClient(version.webSocketDebuggerUrl);
await client.connect();
const rows = [];

const writeProgress = async () => {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        experiment: "PERF-049",
        capturedAt: new Date().toISOString(),
        methodology:
          "Fresh isolated context per variant/route/repetition under Slow 4G and 4x CPU; alternate variant order; observe initial paint, non-blocking KaTeX application at load, and CLS after an immediate programmatic scroll.",
        runtime: { node: process.version, browser: version.Browser },
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
};

try {
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const orderedVariants = repetition % 2 === 1 ? variants : [...variants].reverse();
    for (const route of routes) {
      for (const variant of orderedVariants) {
        const row = await measure(client, repetition, route, variant);
        rows.push(row);
        await writeProgress();
        console.log(`${repetition}/${repetitions} ${route.id} ${variant.id}`);
      }
    }
  }
} finally {
  client.close();
}

console.log(`Wrote ${path.relative(path.resolve(experimentRoot, "../.."), outputPath)}`);
