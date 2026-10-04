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
const baseUrl = process.env.PERF042_BASE_URL || "http://127.0.0.1:3121";
const media = "(min-width: 1280px) and (min-height: 640px)";
const firstUrl = `${baseUrl}/static/images/system-design-db-control-pane.webp?perf042=first`;
const laterUrl = `${baseUrl}/static/images/stick-sessions-load-balancer.webp?perf042=later`;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run"],
});

async function runCase({ id, width, height }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();
  const requests = [];
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setCacheEnabled(false);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  cdp.on("Network.requestWillBeSent", (event) => {
    if (event.type !== "Image") return;
    requests.push({
      url: event.request.url,
      initialPriority: event.request.initialPriority || null,
      initiatorType: event.initiator?.type || null,
    });
  });

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <link rel="preload" as="image" href="${firstUrl}" fetchpriority="high" media="${media}">
      </head>
      <body style="margin:0">
        <div style="height:5000px"></div>
        <img id="first" src="${firstUrl}" width="807" height="939" loading="lazy" fetchpriority="high">
        <div style="height:5000px"></div>
        <img id="later" src="${laterUrl}" width="1080" height="665" loading="lazy">
      </body>
    </html>
  `);
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const before = await page.evaluate((query) => {
    const first = document.querySelector("#first").getBoundingClientRect();
    const later = document.querySelector("#later").getBoundingClientRect();
    return {
      mediaMatches: matchMedia(query).matches,
      firstTop: first.top,
      laterTop: later.top,
    };
  }, media);
  const requestsBeforeScroll = requests.map((request) => ({ ...request }));

  await page.evaluate(() => document.querySelector("#first").scrollIntoView());
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const requestsAfterScroll = requests.map((request) => ({ ...request }));
  await context.close();

  return { id, viewport: { width, height }, before, requestsBeforeScroll, requestsAfterScroll };
}

let mobile;
let desktop;
try {
  mobile = await runCase({ id: "mobile-media-mismatch", width: 390, height: 844 });
  desktop = await runCase({ id: "desktop-media-match", width: 1440, height: 1000 });
} finally {
  await browser.close();
}

assert.equal(mobile.before.mediaMatches, false);
assert.ok(mobile.before.firstTop > 4_000);
assert.equal(
  mobile.requestsBeforeScroll.length,
  0,
  "mismatched preload must not bypass lazy loading"
);
assert.equal(mobile.requestsAfterScroll.filter((request) => request.url === firstUrl).length, 1);
assert.equal(
  mobile.requestsAfterScroll.find((request) => request.url === firstUrl)?.initialPriority,
  "High"
);
assert.equal(
  mobile.requestsAfterScroll.filter((request) => request.url === laterUrl).length,
  0,
  "later unpromoted image must remain lazy"
);

assert.equal(desktop.before.mediaMatches, true);
assert.ok(desktop.before.firstTop > 4_000);
assert.equal(
  desktop.requestsBeforeScroll.filter((request) => request.url === firstUrl).length,
  1,
  "matching preload intentionally bypasses native lazy eligibility"
);
assert.equal(
  desktop.requestsBeforeScroll.find((request) => request.url === firstUrl)?.initialPriority,
  "High"
);
assert.equal(desktop.requestsBeforeScroll.filter((request) => request.url === laterUrl).length, 0);

const output = {
  experiment: "PERF-042 media/lazy adversarial gate",
  generatedAt: new Date().toISOString(),
  media,
  conclusion:
    "A media mismatch preserves zero-request lazy behavior; a match bypasses it even for a far image, so preloadMedia must remain explicit and limited to measured near-viewport layouts.",
  cases: [mobile, desktop],
};
const outputPath = path.join(experimentRoot, "results", "perf042-media-gate.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`PASS: ${output.conclusion}`);
console.log(`Wrote ${outputPath}`);
