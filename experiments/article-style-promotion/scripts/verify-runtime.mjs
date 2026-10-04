#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(experimentRoot, "results/runtime-verification.json");
const screenshotRoot = path.join(experimentRoot, "results/screenshots");
const debuggerUrl = process.env.PERF049_DEBUGGER_URL || "http://127.0.0.1:9225";
const origins = {
  before: process.env.PERF049_BEFORE_ORIGIN || "http://127.0.0.1:3131",
  after: process.env.PERF049_AFTER_ORIGIN || "http://127.0.0.1:3132",
};
const viewport = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.events = [];
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
    if (message.method === "Runtime.exceptionThrown" || message.method === "Log.entryAdded") {
      this.events.push(message);
    }
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

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function createPage(client, javaScriptEnabled = true) {
  const { browserContextId } = await client.send("Target.createBrowserContext");
  const { targetId } = await client.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  await Promise.all([
    client.send("Page.enable", {}, sessionId),
    client.send("Runtime.enable", {}, sessionId),
    client.send("Network.enable", {}, sessionId),
  ]);
  await client.send("Emulation.setDeviceMetricsOverride", viewport, sessionId);
  if (!javaScriptEnabled) {
    await client.send("Emulation.setScriptExecutionDisabled", { value: true }, sessionId);
  }
  return { browserContextId, sessionId };
}

async function navigate(client, sessionId, url) {
  const loaded = client.waitFor("Page.loadEventFired", sessionId);
  await client.send("Page.navigate", { url }, sessionId);
  await loaded;
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function inspect(client, sessionId) {
  return evaluate(
    client,
    sessionId,
    `(() => ({
      links: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => ({
        href: new URL(link.href).pathname,
        marker: link.dataset.articleStyle || null,
        media: link.media || "all",
      })),
      tokenColor: document.querySelector(".prose .token") ? getComputedStyle(document.querySelector(".prose .token")).color : null,
      katexFont: document.querySelector(".prose .katex") ? getComputedStyle(document.querySelector(".prose .katex")).fontFamily : null,
      katexRect: document.querySelector(".prose .katex") ? (() => {
        const rect = document.querySelector(".prose .katex").getBoundingClientRect();
        return { top: rect.top, width: rect.width, height: rect.height };
      })() : null,
      cssResources: performance.getEntriesByType("resource").filter((entry) => /\\.css(?:\\?|$)/.test(entry.name)).map((entry) => ({
        pathname: new URL(entry.name).pathname,
        transferSize: entry.transferSize,
        renderBlockingStatus: entry.renderBlockingStatus || null,
      })),
      promoter: document.querySelector("script[data-article-style-promoter]") ? {
        src: document.querySelector("script[data-article-style-promoter]").src,
        selector: document.querySelector("script[data-article-style-promoter]").dataset.selector,
      } : null,
      promoterResources: performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/promote.")).map((entry) => ({
        pathname: new URL(entry.name).pathname,
        transferSize: entry.transferSize,
      })),
      readyState: document.readyState,
      scrollY,
      katexTop: document.querySelector(".prose .katex")?.getBoundingClientRect().top ?? null,
    }))()`
  );
}

async function captureCase(client, variant, pathname, selector, fileName) {
  const page = await createPage(client);
  try {
    await navigate(client, page.sessionId, new URL(pathname, origins[variant]).href);
    if (selector) {
      await evaluate(
        client,
        page.sessionId,
        `(() => { document.documentElement.style.scrollBehavior = "auto"; document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: "center" }); })()`
      );
    }
    await evaluate(client, page.sessionId, "document.fonts.ready");
    await sleep(250);
    const state = await inspect(client, page.sessionId);
    const screenshot = await client.send(
      "Page.captureScreenshot",
      { format: "png", fromSurface: true },
      page.sessionId
    );
    await writeFile(path.join(screenshotRoot, fileName), Buffer.from(screenshot.data, "base64"));
    return state;
  } finally {
    await client.send("Target.disposeBrowserContext", {
      browserContextId: page.browserContextId,
    });
  }
}

const version = await fetch(`${debuggerUrl}/json/version`).then((response) => response.json());
const client = new CdpClient(version.webSocketDebuggerUrl);
await client.connect();
await mkdir(screenshotRoot, { recursive: true });

try {
  const noStyles = await createPage(client);
  await navigate(
    client,
    noStyles.sessionId,
    new URL("/blog/async-rust-libraries", origins.after).href
  );
  const noStylesState = await inspect(client, noStyles.sessionId);
  await client.send("Target.disposeBrowserContext", {
    browserContextId: noStyles.browserContextId,
  });
  assert.equal(
    noStylesState.links.some((link) => link.marker),
    false
  );

  const noJavaScript = await createPage(client, false);
  await navigate(
    client,
    noJavaScript.sessionId,
    new URL("/blog/dissecting-bash-script", origins.after).href
  );
  const noJavaScriptState = await inspect(client, noJavaScript.sessionId);
  await client.send("Target.disposeBrowserContext", {
    browserContextId: noJavaScript.browserContextId,
  });
  assert.equal(
    noJavaScriptState.links.some(
      (link) => link.marker === "katex-noscript" && link.media === "all"
    ),
    true
  );
  assert.match(noJavaScriptState.katexFont, /^KaTeX_Main/);

  const cachePage = await createPage(client);
  await navigate(client, cachePage.sessionId, new URL("/blog/bash-chmod", origins.after).href);
  await navigate(
    client,
    cachePage.sessionId,
    new URL("/blog/bash-clear-screen", origins.after).href
  );
  const cacheState = await inspect(client, cachePage.sessionId);
  await client.send("Target.disposeBrowserContext", {
    browserContextId: cachePage.browserContextId,
  });
  const cachedPrism = cacheState.cssResources.find((entry) => /\/prism\./.test(entry.pathname));
  assert.equal(cachedPrism?.transferSize, 0);

  const screenshots = {
    codeBefore: await captureCase(
      client,
      "before",
      "/blog/bash-clear-screen",
      ".prose pre",
      "code-before.png"
    ),
    codeAfter: await captureCase(
      client,
      "after",
      "/blog/bash-clear-screen",
      ".prose pre",
      "code-after.png"
    ),
    mathBefore: await captureCase(
      client,
      "before",
      "/blog/dissecting-bash-script",
      ".prose .katex",
      "math-before.png"
    ),
    mathAfter: await captureCase(
      client,
      "after",
      "/blog/dissecting-bash-script",
      ".prose .katex",
      "math-after.png"
    ),
  };

  assert.equal(screenshots.codeBefore.tokenColor, screenshots.codeAfter.tokenColor);
  assert.equal(screenshots.mathBefore.katexFont, screenshots.mathAfter.katexFont);
  assert.equal(
    screenshots.mathAfter.links.some((link) => link.marker === "katex" && link.media === "all"),
    true
  );
  assert.equal(client.events.length, 0, JSON.stringify(client.events));

  const prismHref = screenshots.codeAfter.links.find((link) => link.marker === "prism").href;
  const headers = await fetch(new URL(prismHref, origins.after), { method: "HEAD" });
  const result = {
    experiment: "PERF-049",
    capturedAt: new Date().toISOString(),
    runtime: { node: process.version, browser: version.Browser },
    checks: {
      noStyleArticleOmitsArticleLinks: true,
      noJavaScriptKatexFallback: true,
      articleToArticlePrismTransferBytes: cachedPrism.transferSize,
      codeTokenColorParity: screenshots.codeAfter.tokenColor,
      promotedKatexFontParity: screenshots.mathAfter.katexFont,
      promotedKatexMedia: screenshots.mathAfter.links.find((link) => link.marker === "katex").media,
      assetCacheControl: headers.headers.get("cache-control"),
      assetCsp: headers.headers.get("content-security-policy"),
      runtimeExceptions: client.events.length,
    },
    noStylesState,
    noJavaScriptState,
    cacheState,
    screenshots,
  };
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result.checks, null, 2));
  console.log(`Wrote ${path.relative(path.resolve(experimentRoot, "../.."), outputPath)}`);
} finally {
  client.close();
}
