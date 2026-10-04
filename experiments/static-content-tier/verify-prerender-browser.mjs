import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.PERF031_BASE_URL || "http://localhost:3120";
const cases = ["prerender-immediate", "prerender-dwell"];
const runsPerCase = 3;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function verifyRun(variant, sequence) {
  const profile = mkdtempSync(path.join(tmpdir(), "perf031-behavior-"));
  const debugPort = 9_800 + sequence;
  const sourceUrl = new URL(`/hybrid/${variant}/home`, baseUrl);
  sourceUrl.searchParams.set("perf031-autorun", "1");
  sourceUrl.searchParams.set("start-ms", "500");
  sourceUrl.searchParams.set("hover-ms", "1000");
  const chrome = spawn(
    "/opt/google/chrome/chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-color-profile=srgb",
      "--force-device-scale-factor=2",
      "--window-size=390,844",
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      sourceUrl.href,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

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

    await wait(3_000);
    const pages = await browser.pages();
    const page = pages.find((candidate) => candidate.url().startsWith(baseUrl));
    if (!page) throw new Error(`Cannot find the test page: ${pages.map((item) => item.url())}`);
    const client = await page.createCDPSession();
    const activation = await page.evaluate(() => ({
      path: location.pathname,
      activationStart: performance.getEntriesByType("navigation")[0]?.activationStart ?? 0,
      lifecycle: document.documentElement.dataset.perf031Lifecycle,
      heading: document.querySelector("h1")?.textContent,
    }));

    let interactions = null;
    if (sequence <= cases.length) {
      await page.click("[data-hybrid-menu-open]");
      const menuOpen = await page.$eval("[data-hybrid-menu]", (dialog) => dialog.open);
      await page.click("[data-hybrid-menu-close]");
      await page.click("[data-hybrid-search]");
      await page.waitForFunction(() => document.querySelector("[data-hybrid-search-dialog]")?.open);
      await page.waitForFunction(
        () => document.querySelectorAll("[data-hybrid-search-results] [role=option]").length > 0
      );
      const search = await page.evaluate(() => ({
        open: document.querySelector("[data-hybrid-search-dialog]")?.open,
        inputFocused: document.activeElement?.id === "hybrid-search-input",
        status: document.querySelector("[data-hybrid-search-status]")?.textContent,
        resultCount: document.querySelectorAll("[data-hybrid-search-results] [role=option]").length,
      }));
      await page.click("[data-hybrid-search-close]");
      interactions = { menuOpen, search };
    }

    const navigationHistory = await client.send("Page.getNavigationHistory");
    await browser.close();
    return {
      variant,
      run: sequence,
      activation,
      interactions,
      history: {
        currentIndex: navigationHistory.currentIndex,
        entries: navigationHistory.entries.map((entry) => entry.url),
      },
    };
  } finally {
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGTERM");
      await Promise.race([exited, wait(2_000)]);
    }
    await wait(500);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile ${profile}: ${error.message}`);
    }
  }
}

const results = [];
let sequence = 0;
for (let round = 0; round < runsPerCase; round += 1) {
  for (const variant of round % 2 ? [...cases].reverse() : cases) {
    sequence += 1;
    const result = await verifyRun(variant, sequence);
    results.push(result);
    console.log(
      `${variant} ${round + 1}/${runsPerCase}: activation ${result.activation.activationStart} ms, history entries ${result.history.entries.length}`
    );
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  browser: "Chrome 145 detached until after prerender activation",
  profile: {
    sourceState: "new browser process and fresh profile per run",
    action: "activate article prerender, verify enhanced controls, and inspect navigation history",
    runsPerCase,
  },
  results,
  summary: Object.fromEntries(
    cases.map((variant) => {
      const samples = results.filter((result) => result.variant === variant);
      return [
        variant,
        {
          activationSuccesses: samples.filter((sample) => sample.activation.activationStart > 0)
            .length,
          validTwoEntryHistories: samples.filter(
            (sample) => sample.history.currentIndex === 1 && sample.history.entries.length === 2
          ).length,
          interactionChecks: samples.filter(
            (sample) =>
              sample.interactions?.menuOpen &&
              sample.interactions?.search.open &&
              sample.interactions?.search.inputFocused &&
              sample.interactions?.search.resultCount > 0
          ).length,
        },
      ];
    })
  ),
  limitations: [
    "The activated tab retained the expected two-entry history, but Puppeteer goBack, history.back, and Page.navigateToHistoryEntry did not drive the detached-prerender target back to the source. This harness therefore makes no bfcache claim for PERF-031.",
    "PERF-030 separately verified the shared document tier's browser Back path and bfcache restoration in 5/5 samples.",
  ],
};
mkdirSync(path.join(fixtureRoot, "results"), { recursive: true });
writeFileSync(
  path.join(fixtureRoot, "results/prerender-behavior-verification.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
