import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { routes } from "./fixture.mjs";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(experimentRoot, "../..");
const requireFromFixture = createRequire(
  path.join(experimentRoot, "../static-content-tier/package.json")
);
const puppeteer = requireFromFixture("puppeteer-core");
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const baseUrl = process.env.PERF045_APP_URL || "http://127.0.0.1:3121";
const screenshotRoot = path.join(experimentRoot, "results", "tag-screenshots");
mkdirSync(screenshotRoot, { recursive: true });

function compareImages(reference, candidate) {
  const comparison = spawnSync("compare", ["-metric", "AE", reference, candidate, "null:"], {
    encoding: "utf8",
  });
  if (![0, 1].includes(comparison.status)) {
    throw new Error(comparison.stderr || comparison.stdout || "ImageMagick compare failed");
  }
  return Number.parseInt(comparison.stderr.trim(), 10);
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run"],
});
const comparisons = [];

try {
  for (const route of routes) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.setCacheEnabled(false);
    await page.goto(new URL(`${route.path}?perf045_visual=tag-final`, baseUrl).href, {
      waitUntil: "networkidle0",
      timeout: 120_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    const candidate = path.join(screenshotRoot, `${route.id}-after.png`);
    await page.screenshot({ path: candidate });
    const reference = path.join(
      repositoryRoot,
      "experiments/image-publication-delay/results/screenshots",
      `${route.id}-full.png`
    );
    const affectedPixels = compareImages(reference, candidate);
    comparisons.push({ route: route.id, reference, candidate, affectedPixels });
    await context.close();
  }
} finally {
  await browser.close();
}

for (const comparison of comparisons) {
  assert.equal(comparison.affectedPixels, 0, `${comparison.route}: viewport pixels changed`);
}

const outputPath = path.join(experimentRoot, "results/perf045-tag-visual.json");
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      experiment: "PERF-045 tag-link production visual guardrail",
      generatedAt: new Date().toISOString(),
      viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, colorScheme: "light" },
      comparisons,
    },
    null,
    2
  )}\n`
);
console.table(comparisons.map(({ route, affectedPixels }) => ({ route, affectedPixels })));
console.log(`Wrote ${outputPath}`);
