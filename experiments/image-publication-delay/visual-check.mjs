import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { routes, variants } from "./fixture.mjs";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const requireFromFixture = createRequire(
  path.join(experimentRoot, "../static-content-tier/package.json")
);
const puppeteer = requireFromFixture("puppeteer-core");
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";
const baseUrl = process.env.PERF044_BASE_URL || "http://127.0.0.1:3122";
const screenshotRoot = path.join(experimentRoot, "results", "screenshots");
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
const captures = [];

try {
  for (const route of routes) {
    for (const variant of variants) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
      await page.setCacheEnabled(false);
      await page.evaluateOnNewDocument((targetAlt) => {
        globalThis.__perf044VisualLcp = false;
        new PerformanceObserver((list) => {
          if (
            list.getEntries().some((entry) => entry.element?.getAttribute?.("alt") === targetAlt)
          ) {
            globalThis.__perf044VisualLcp = true;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }, route.targetAlt);
      const url = new URL(route.path, baseUrl);
      url.searchParams.set("perf044_variant", variant);
      url.searchParams.set("perf044_visual", "1");
      await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForFunction(
        (targetAlt) =>
          [...document.images].some((image) => image.alt === targetAlt && image.complete) &&
          globalThis.__perf044VisualLcp,
        { timeout: 30_000 },
        route.targetAlt
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      const file = path.join(screenshotRoot, `${route.id}-${variant}.png`);
      await page.screenshot({ path: file });
      const semantics = await page.evaluate((targetAlt) => {
        const image = [...document.images].find((candidate) => candidate.alt === targetAlt);
        const rect = image.getBoundingClientRect();
        return {
          title: document.querySelector("article header h1")?.textContent?.trim() || null,
          targetAlt: image.alt,
          currentSrc: image.currentSrc,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          landmarkCounts: {
            banner: document.querySelectorAll("header").length,
            navigation: document.querySelectorAll("nav").length,
            main: document.querySelectorAll("main").length,
            article: document.querySelectorAll("article").length,
          },
        };
      }, route.targetAlt);
      captures.push({ route: route.id, variant, file, semantics });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const comparisons = [];
for (const route of routes) {
  const reference = captures.find(
    (capture) => capture.route === route.id && capture.variant === "full"
  );
  for (const candidate of captures.filter(
    (capture) => capture.route === route.id && capture.variant !== "full"
  )) {
    comparisons.push({
      route: route.id,
      variant: candidate.variant,
      affectedPixels: compareImages(reference.file, candidate.file),
    });
  }
}

const outputPath = path.join(experimentRoot, "results", "perf044-visual.json");
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      experiment: "PERF-044 viewport visual and semantic guardrail",
      generatedAt: new Date().toISOString(),
      viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, colorScheme: "light" },
      captures,
      comparisons,
    },
    null,
    2
  )}\n`
);
console.table(comparisons);
console.log(`Wrote ${outputPath}`);
