import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import cacheAssets from "./generated/cache-assets.json" with { type: "json" };

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = "/tmp/perf038-cache-freshness";
const baseUrl = process.env.PERF038_BASE_URL || "http://localhost:3120";
const assetPolicies = ["mutable", "hashed-stale", "hashed-immutable"];
mkdirSync(screenshotRoot, { recursive: true });

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value, policy) {
  return Object.entries(cacheAssets.policies[policy] ?? {}).reduce(
    (normalized, [source, target]) => normalized.replaceAll(target, source),
    value
  );
}

function compare(reference, candidate, diff) {
  const result = spawnSync("compare", ["-metric", "AE", reference, candidate, diff], {
    encoding: "utf8",
  });
  if (![0, 1].includes(result.status)) throw new Error(result.stderr);
  const match = `${result.stderr}${result.stdout}`.match(/^([0-9.e+-]+)/i);
  if (!match) throw new Error(`Cannot parse ImageMagick output: ${result.stderr}`);
  return Number(match[1]);
}

const browser = await puppeteer.launch({
  executablePath: "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});
const captures = [];
try {
  for (const assetPolicy of assetPolicies) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "light"));
    const url = new URL("/hybrid/prerender-dwell/article", baseUrl);
    url.searchParams.set("perf031-measure", "1");
    url.searchParams.set("perf037-head-order", "css-first");
    url.searchParams.set("perf038-cache", assetPolicy);
    await page.goto(url.href, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              })
          )
      );
    });
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
    });
    const semantics = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      heading: document.querySelector("h1")?.textContent,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      body: document.body.innerHTML,
      headTokens: [...document.head.children].map((element) => element.outerHTML).sort(),
    }));
    const screenshot = path.join(screenshotRoot, `${assetPolicy}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    const normalizedHeadTokens = semantics.headTokens
      .map((token) => normalize(token, assetPolicy))
      .sort();
    captures.push({
      assetPolicy,
      screenshot,
      title: semantics.title,
      lang: semantics.lang,
      heading: semantics.heading,
      canonical: semantics.canonical,
      normalizedBodySha256: hash(normalize(semantics.body, assetPolicy)),
      normalizedSortedHeadTokensSha256: hash(JSON.stringify(normalizedHeadTokens)),
      normalizedHeadTokens,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const reference = captures.find((capture) => capture.assetPolicy === "mutable");
const comparisons = captures
  .filter((capture) => capture !== reference)
  .map((capture) => ({
    reference: reference.assetPolicy,
    candidate: capture.assetPolicy,
    affectedPixels: compare(
      reference.screenshot,
      capture.screenshot,
      path.join(screenshotRoot, `diff-${capture.assetPolicy}.png`)
    ),
    normalizedBodyMatches: capture.normalizedBodySha256 === reference.normalizedBodySha256,
    normalizedHeadTokenMultisetMatches:
      capture.normalizedSortedHeadTokensSha256 === reference.normalizedSortedHeadTokensSha256,
    headTokenDifferences: {
      missingFromCandidate: reference.normalizedHeadTokens.filter(
        (token) => !capture.normalizedHeadTokens.includes(token)
      ),
      addedByCandidate: capture.normalizedHeadTokens.filter(
        (token) => !reference.normalizedHeadTokens.includes(token)
      ),
    },
    metadataMatches:
      capture.title === reference.title &&
      capture.lang === reference.lang &&
      capture.heading === reference.heading &&
      capture.canonical === reference.canonical,
  }));
const output = {
  generatedAt: new Date().toISOString(),
  profile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    colorScheme: "light",
    state: "direct article load after fonts and images settle; animations disabled",
  },
  captures: captures.map(({ screenshot, normalizedHeadTokens, ...capture }) => capture),
  comparisons,
  rawScreenshots: `${screenshotRoot}/*.png (intentionally not committed)`,
  limitations: [
    "This is a deterministic light-mobile top-viewport comparison, not a full breakpoint and interaction visual-regression suite.",
    "Asset URLs are normalized through the generated mapping before semantic hashes are compared; fixture tests separately prove the underlying content-addressed files and renderer contract.",
  ],
};
writeFileSync(
  path.join(fixtureRoot, "results/perf038-visual-parity.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
console.table(comparisons);
