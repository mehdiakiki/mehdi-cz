#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(experimentRoot, "results/corpus-audit.json");
const outputPath = path.join(experimentRoot, "results/geometry-audit.json");
const debuggerUrl = process.env.PERF049_DEBUGGER_URL || "http://127.0.0.1:9225";
const origin = process.env.PERF049_ORIGIN || "http://127.0.0.1:3131";
const profiles = [
  { id: "mobile", width: 390, height: 844, deviceScaleFactor: 2.75, mobile: true },
  { id: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
];

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

  waitFor(method, sessionId, timeoutMs = 30_000) {
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

function elementGeometry(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: Math.round(rect.top + window.scrollY),
    height: Math.round(rect.height),
    width: Math.round(rect.width),
  };
}

const evaluateSource = `(() => {
  const geometry = ${elementGeometry.toString()};
  const stylesheets = [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean);
  return {
    pathname: location.pathname,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    documentHeight: document.documentElement.scrollHeight,
    prose: geometry(".prose"),
    firstPre: geometry(".prose pre"),
    firstKatex: geometry(".prose .katex"),
    preCount: document.querySelectorAll(".prose pre").length,
    katexCount: document.querySelectorAll(".prose .katex").length,
    stylesheets,
  };
})()`;

const corpus = JSON.parse(await readFile(inputPath, "utf8"));
const published = corpus.posts.filter((post) => post.status === "published");
const version = await fetch(`${debuggerUrl}/json/version`).then((response) => response.json());
const client = new CdpClient(version.webSocketDebuggerUrl);
await client.connect();

const { browserContextId } = await client.send("Target.createBrowserContext");
const { targetId } = await client.send("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
await Promise.all([
  client.send("Page.enable", {}, sessionId),
  client.send("Runtime.enable", {}, sessionId),
]);

const rows = [];
const writeProgress = async () => {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        experiment: "PERF-049",
        capturedAt: new Date().toISOString(),
        methodology:
          "Navigate every published article in one isolated browser context at mobile and desktop viewports; capture the first rendered pre/KaTeX document offset after load.",
        runtime: { browser: version.Browser, protocol: version["Protocol-Version"] },
        origin,
        profiles,
        expectedRows: published.length * profiles.length,
        rows,
      },
      null,
      2
    )}\n`
  );
};

try {
  for (const profile of profiles) {
    await client.send("Emulation.setDeviceMetricsOverride", profile, sessionId);
    for (const [index, post] of published.entries()) {
      const loaded = client.waitFor("Page.loadEventFired", sessionId);
      await client.send(
        "Page.navigate",
        { url: new URL(`/blog/${encodeURI(post.slug)}`, origin).href },
        sessionId
      );
      await loaded;
      const evaluated = await client.send(
        "Runtime.evaluate",
        { expression: evaluateSource, returnByValue: true },
        sessionId
      );
      if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text);
      rows.push({ profile: profile.id, slug: post.slug, ...evaluated.result.value });
      if ((index + 1) % 25 === 0) {
        await writeProgress();
        console.log(`${profile.id}: ${index + 1}/${published.length}`);
      }
    }
  }
  await writeProgress();
} finally {
  await client.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  client.close();
}

const withCode = rows.filter((row) => row.firstPre);
const summary = Object.fromEntries(
  profiles.map((profile) => {
    const matches = withCode.filter((row) => row.profile === profile.id);
    return [
      profile.id,
      {
        codeRoutes: matches.length,
        initiallyVisible: matches.filter((row) => row.firstPre.top < profile.height).length,
        withinOneViewportMargin: matches.filter((row) => row.firstPre.top < profile.height * 2)
          .length,
        earliest: matches
          .toSorted((left, right) => left.firstPre.top - right.firstPre.top)
          .slice(0, 10)
          .map(({ slug, firstPre }) => ({ slug, firstPre })),
      },
    ];
  })
);

console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${path.relative(path.resolve(experimentRoot, "../.."), outputPath)}`);
