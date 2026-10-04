import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = "/tmp/perf031-visual";
const baseUrl = process.env.PERF031_BASE_URL || "http://localhost:3120";
mkdirSync(screenshotRoot, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});
try {
  for (const variant of ["shared", "prerender-dwell"]) {
    for (const pageName of ["home", "article"]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
      await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "light"));
      await page.goto(`${baseUrl}/hybrid/${variant}/${pageName}`, { waitUntil: "networkidle0" });
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
      await page.screenshot({
        path: path.join(screenshotRoot, `${variant}-${pageName}.png`),
        fullPage: false,
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const comparisons = ["home", "article"].map((pageName) => {
  const reference = path.join(screenshotRoot, `shared-${pageName}.png`);
  const candidate = path.join(screenshotRoot, `prerender-dwell-${pageName}.png`);
  const diff = path.join(screenshotRoot, `diff-${pageName}.png`);
  const result = spawnSync("compare", ["-metric", "AE", reference, candidate, diff], {
    encoding: "utf8",
  });
  if (![0, 1].includes(result.status)) throw new Error(result.stderr);
  const match = `${result.stderr}${result.stdout}`.match(/^([0-9.e+-]+)/i);
  if (!match) throw new Error(`Cannot parse ImageMagick output: ${result.stderr}`);
  return { page: pageName, affectedPixels: Number(match[1]) };
});

const output = {
  generatedAt: new Date().toISOString(),
  profile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    colorScheme: "light",
    state: "top viewport after fonts and images settle",
  },
  comparisons,
  rawScreenshots: `${screenshotRoot}/*.png (intentionally not committed)`,
};
writeFileSync(
  path.join(fixtureRoot, "results/prerender-visual-parity.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
console.table(comparisons);
