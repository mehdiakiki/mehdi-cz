import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.PERF031_BASE_URL || "http://localhost:3120";
const debugPort = 9321;
const profile = mkdtempSync(path.join(tmpdir(), "perf031-detached-"));
const chrome = spawn(
  "/opt/google/chrome/chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-device-scale-factor=2",
    "--window-size=390,844",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    `${baseUrl}/hybrid/prerender-immediate/home?perf031-autorun=1&hover-ms=1000`,
  ],
  { stdio: ["ignore", "ignore", "pipe"] }
);
let stderr = "";
chrome.stderr.on("data", (chunk) => {
  stderr += chunk;
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

  await wait(5_000);
  const pages = await browser.pages();
  const page = pages.find((candidate) => candidate.url().startsWith(baseUrl));
  if (!page) throw new Error(`Cannot find the test page: ${pages.map((item) => item.url())}`);
  const result = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    return {
      url: location.href,
      activationStart: navigation?.activationStart ?? null,
      navigationType: navigation?.type ?? null,
      lifecycle: document.documentElement.dataset.perf031Lifecycle,
      recordedActivationStart: document.documentElement.dataset.perf031ActivationStart,
      measuredActivationStart: document.documentElement.dataset.perf031MeasureActivationStart,
      firstContentfulPaint: document.documentElement.dataset.perf031MeasureFcp,
      clickToFirstContentfulPaint: document.documentElement.dataset.perf031MeasureClickToFcp,
      prerendering: document.prerendering,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    };
  });
  console.log(JSON.stringify(result, null, 2));
  browser.disconnect();
} finally {
  chrome.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => chrome.once("exit", resolve)), wait(2_000)]);
  rmSync(profile, { recursive: true, force: true });
}
