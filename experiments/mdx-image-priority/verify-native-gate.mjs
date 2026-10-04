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
const baseUrl = process.env.PERF041_BASE_URL || "http://127.0.0.1:3121";
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const outputPath = path.join(experimentRoot, "results", "perf041-native-gate.json");
const promotedUrl = `${baseUrl}/static/images/system-design-db-control-pane.webp?perf041=promoted`;
const laterUrl = `${baseUrl}/static/images/stick-sessions-load-balancer.webp?perf041=later`;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let result;

try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();
  const requests = [];

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await page.setCacheEnabled(false);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  cdp.on("Network.requestWillBeSent", (event) => {
    if (event.type !== "Image") return;
    requests.push({
      url: event.request.url,
      initialPriority: event.request.initialPriority || null,
    });
  });

  await page.setContent(`
    <!doctype html>
    <html>
      <body style="margin: 0">
        <div style="height: 5000px"></div>
        <img
          id="promoted"
          src="${promotedUrl}"
          alt="Promoted far image"
          width="390"
          height="454"
          loading="lazy"
          fetchpriority="high"
        />
        <div style="height: 5000px"></div>
        <img
          id="later"
          src="${laterUrl}"
          alt="Later ordinary image"
          width="390"
          height="240"
          loading="lazy"
        />
      </body>
    </html>
  `);
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const before = await page.evaluate(() => {
    const promoted = document.querySelector("#promoted");
    const later = document.querySelector("#later");
    return {
      scrollY,
      promoted: {
        top: promoted.getBoundingClientRect().top,
        loading: promoted.loading,
        fetchPriority: promoted.fetchPriority,
        complete: promoted.complete,
      },
      later: {
        top: later.getBoundingClientRect().top,
        loading: later.loading,
        fetchPriority: later.fetchPriority,
        complete: later.complete,
      },
    };
  });
  assert.equal(
    requests.some((request) => request.url === promotedUrl),
    false
  );
  assert.equal(
    requests.some((request) => request.url === laterUrl),
    false
  );

  await page.evaluate(() =>
    document.querySelector("#promoted").scrollIntoView({ block: "center" })
  );
  await page.waitForFunction(
    () => {
      const image = document.querySelector("#promoted");
      return image.complete && image.naturalWidth > 0;
    },
    { timeout: 30_000 }
  );
  await new Promise((resolve) => setTimeout(resolve, 250));

  const after = await page.evaluate(() => {
    const promoted = document.querySelector("#promoted");
    const later = document.querySelector("#later");
    return {
      scrollY,
      promoted: {
        top: promoted.getBoundingClientRect().top,
        complete: promoted.complete,
        naturalWidth: promoted.naturalWidth,
      },
      later: {
        top: later.getBoundingClientRect().top,
        complete: later.complete,
      },
    };
  });
  const promotedRequest = requests.find((request) => request.url === promotedUrl);
  const laterRequest = requests.find((request) => request.url === laterUrl);

  assert.equal(before.promoted.loading, "lazy");
  assert.equal(before.promoted.fetchPriority, "high");
  assert.ok(before.promoted.top > 4_000);
  assert.equal(promotedRequest?.initialPriority, "High");
  assert.equal(laterRequest, undefined);
  assert.equal(after.promoted.complete, true);
  assert.ok(after.promoted.naturalWidth > 0);
  assert.ok(after.later.top > 844);

  result = {
    experiment: "PERF-041 native far-image gate",
    generatedAt: new Date().toISOString(),
    viewport: { width: 390, height: 844, dpr: 1 },
    beforeScroll: before,
    afterPromotedScroll: after,
    requests,
    claims: {
      promotedImageUnrequestedWhileFar: true,
      promotedImageStartsHighOnlyAfterApproach: true,
      laterLazyImageRemainsUnrequested: true,
    },
  };
  await context.close();
} finally {
  await browser.close();
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.claims, null, 2));
console.log(`Wrote ${outputPath}`);
