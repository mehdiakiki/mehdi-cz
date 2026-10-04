import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = "/tmp/perf039-avatar-sizing";
const baseUrl = process.env.PERF039_BASE_URL || "http://localhost:3120";
const policies = ["legacy-responsive", "fixed-40"];
mkdirSync(screenshotRoot, { recursive: true });

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function imageMetric(metric, reference, candidate, diff) {
  const args = ["-metric", metric, reference, candidate];
  if (diff) args.push(diff);
  else args.push("null:");
  const result = spawnSync("compare", args, { encoding: "utf8" });
  if (![0, 1].includes(result.status)) throw new Error(result.stderr);
  const output = `${result.stderr}${result.stdout}`.trim();
  const normalized = output.match(/\(([0-9.e+-]+)\)/i)?.[1];
  const absolute = output.match(/^([0-9.e+-]+)/i)?.[1];
  if (!absolute) throw new Error(`Cannot parse ImageMagick ${metric}: ${output}`);
  return { absolute: Number(absolute), normalized: normalized ? Number(normalized) : null };
}

function normalizeAvatarHints(html) {
  return html
    .replace(
      /((?:image)?sizes)="(?:\(max-width: 640px\) 100vw, \(max-width: 768px\) 75vw, \(max-width: 1024px\) 50vw, 33vw|40px)"/g,
      '$1="__AVATAR_SIZES__"'
    )
    .replace(
      /((?:image)?srcset)="[^"]*mehdi_image_enhanced_square\.webp[^"]*"/g,
      '$1="__AVATAR_SRCSET__"'
    );
}

const browser = await puppeteer.launch({
  executablePath: "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});
const captures = [];
try {
  for (const avatarSizePolicy of policies) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "light"));
    const url = new URL("/hybrid/prerender-dwell/article", baseUrl);
    url.searchParams.set("perf031-measure", "1");
    url.searchParams.set("perf037-head-order", "css-first");
    url.searchParams.set("perf038-cache", "hashed-immutable");
    url.searchParams.set("perf039-avatar-size", avatarSizePolicy);
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
    const semantics = await page.evaluate(() => {
      const avatar = document.querySelector('img[alt$=" avatar"]');
      const avatarUrl = avatar?.currentSrc ? new URL(avatar.currentSrc) : null;
      const rect = avatar?.getBoundingClientRect();
      const resource = avatar
        ? performance.getEntriesByType("resource").find((entry) => entry.name === avatar.currentSrc)
        : null;
      const box = (selector) => {
        const elementRect = document.querySelector(selector)?.getBoundingClientRect();
        return elementRect
          ? {
              x: elementRect.x,
              y: elementRect.y,
              width: elementRect.width,
              height: elementRect.height,
            }
          : null;
      };
      return {
        title: document.title,
        heading: document.querySelector("h1")?.textContent,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        normalizedBodySource: document.body.innerHTML,
        normalizedHeadSource: document.head.innerHTML,
        layout: {
          header: box("article header"),
          authorList: box("article dd ul"),
          articleBody: box("article .prose"),
          avatar: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        },
        avatar: avatar
          ? {
              sizes: avatar.sizes,
              candidateWidth: Number(avatarUrl?.searchParams.get("w")) || null,
              naturalWidth: avatar.naturalWidth,
              naturalHeight: avatar.naturalHeight,
              clientWidth: avatar.clientWidth,
              clientHeight: avatar.clientHeight,
              encodedBodyBytes: resource?.encodedBodySize ?? null,
            }
          : null,
      };
    });
    const screenshot = path.join(screenshotRoot, `${avatarSizePolicy}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    captures.push({
      avatarSizePolicy,
      screenshot,
      title: semantics.title,
      heading: semantics.heading,
      canonical: semantics.canonical,
      normalizedBodySha256: hash(normalizeAvatarHints(semantics.normalizedBodySource)),
      normalizedHeadSha256: hash(normalizeAvatarHints(semantics.normalizedHeadSource)),
      layout: semantics.layout,
      avatar: semantics.avatar,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const reference = captures[0];
const candidate = captures[1];
const diffPath = path.join(screenshotRoot, "diff-fixed-40.png");
const absoluteError = imageMetric("AE", reference.screenshot, candidate.screenshot, diffPath);
const rmse = imageMetric("RMSE", reference.screenshot, candidate.screenshot);
const psnr = imageMetric("PSNR", reference.screenshot, candidate.screenshot);
const comparison = {
  reference: reference.avatarSizePolicy,
  candidate: candidate.avatarSizePolicy,
  affectedPixels: absoluteError.absolute,
  affectedViewportPercent: Number(
    ((absoluteError.absolute / (390 * 844 * 2 ** 2)) * 100).toFixed(4)
  ),
  normalizedRmse: rmse.normalized,
  psnrDb: psnr.absolute,
  normalizedBodyMatches: candidate.normalizedBodySha256 === reference.normalizedBodySha256,
  normalizedHeadMatches: candidate.normalizedHeadSha256 === reference.normalizedHeadSha256,
  layoutMatches: JSON.stringify(candidate.layout) === JSON.stringify(reference.layout),
  metadataMatches:
    candidate.title === reference.title &&
    candidate.heading === reference.heading &&
    candidate.canonical === reference.canonical,
};
const output = {
  generatedAt: new Date().toISOString(),
  profile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    colorScheme: "light",
    state: "direct article load after fonts and images settle; animations disabled",
  },
  captures: captures.map(({ screenshot, ...capture }) => capture),
  comparison,
  rawScreenshots: `${screenshotRoot}/*.png (intentionally not committed)`,
  limitations: [
    "A responsive-image correction intentionally changes decoded avatar pixels; visual acceptance uses identical geometry/semantics plus bounded whole-viewport error rather than requiring zero differing pixels.",
    "This is a deterministic light-mobile top-viewport sample, not a complete visual-regression matrix.",
  ],
};
writeFileSync(
  path.join(fixtureRoot, "results/perf039-visual-parity.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
console.table([comparison]);
