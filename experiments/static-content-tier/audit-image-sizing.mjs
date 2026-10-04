import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.PERF040_BASE_URL || "http://127.0.0.1:3121";
const phase = process.env.PERF040_PHASE || "before";
const outputPath = path.join(experimentRoot, "results", `perf040-${phase}-image-audit.json`);
const chromePath = process.env.CHROME_PATH || "/opt/google/chrome/chrome";

const routes = [
  { id: "about", path: "/about" },
  {
    id: "post-control-plane",
    path: "/blog/design-control-plane-distributed-database",
  },
  {
    id: "post-load-balancer",
    path: "/blog/load-balancer-sticky-sessions-course",
  },
];

const profiles = [
  { id: "mobile-dpr1", width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
  { id: "mobile-dpr2", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  { id: "desktop-dpr1", width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  { id: "desktop-dpr2", width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false },
];

const round = (value, places = 3) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function selectedWidth(currentSrc) {
  try {
    return Number(new URL(currentSrc).searchParams.get("w")) || null;
  } catch {
    return null;
  }
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-color-profile=srgb",
  ],
});

const rows = [];

try {
  for (const route of routes) {
    for (const profile of profiles) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setCacheEnabled(false);
      await page.setViewport({
        width: profile.width,
        height: profile.height,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.mobile,
        hasTouch: profile.mobile,
      });
      await page.evaluateOnNewDocument(() => {
        window.__perf040Lcp = [];
        new PerformanceObserver((list) => {
          window.__perf040Lcp.push(
            ...list.getEntries().map((entry) => ({
              startTime: entry.startTime,
              url: entry.url || "",
              tagName: entry.element?.tagName || "",
              alt: entry.element?.getAttribute?.("alt") || "",
              text: entry.element?.textContent?.trim?.().slice(0, 120) || "",
            }))
          );
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });

      const url = new URL(route.path, baseUrl).href;
      const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
      if (!response?.ok()) throw new Error(`${url} returned ${response?.status()}`);

      const initial = await page.evaluate(() => ({
        lcp: window.__perf040Lcp?.at(-1) || null,
        images: [...document.images].map((image, index) => {
          const box = image.getBoundingClientRect();
          return {
            index,
            top: box.top,
            initiallyInViewport: box.top < innerHeight && box.bottom > 0,
          };
        }),
      }));

      for (let index = 0; index < initial.images.length; index += 1) {
        await page.evaluate((imageIndex) => {
          document.images[imageIndex]?.scrollIntoView({ block: "center" });
        }, index);
        await page.waitForFunction(
          (imageIndex) => {
            const image = document.images[imageIndex];
            return !image || (image.complete && image.naturalWidth > 0);
          },
          { timeout: 30_000 },
          index
        );
        await page.evaluate(
          (imageIndex) => document.images[imageIndex]?.decode().catch(() => {}),
          index
        );
      }

      const result = await page.evaluate((initialImages) => {
        const resources = performance.getEntriesByType("resource");
        const preloads = [...document.querySelectorAll('link[rel="preload"][as="image"]')].map(
          (link) => ({
            href: link.href,
            imageSrcset: link.imageSrcset,
            imageSizes: link.imageSizes,
            fetchPriority: link.fetchPriority,
          })
        );
        return {
          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          documentBytes: new TextEncoder().encode(document.documentElement.outerHTML).length,
          preloads,
          images: [...document.images].map((image, index) => {
            const resource = resources.find((entry) => entry.name === image.currentSrc);
            const box = image.getBoundingClientRect();
            return {
              index,
              alt: image.alt,
              originalTop: initialImages[index]?.top ?? null,
              initiallyInViewport: initialImages[index]?.initiallyInViewport ?? null,
              clientWidth: box.width,
              clientHeight: box.height,
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              currentSrc: image.currentSrc,
              sizes: image.sizes,
              loading: image.loading,
              fetchPriority: image.fetchPriority,
              srcset: image.srcset,
              srcsetCandidates: image.srcset ? image.srcset.split(",").length : 0,
              srcsetBytes: new TextEncoder().encode(image.srcset).length,
              encodedBodyBytes: resource?.encodedBodySize ?? null,
              transferBytes: resource?.transferSize ?? null,
              responseEnd: resource?.responseEnd ?? null,
            };
          }),
        };
      }, initial.images);

      const row = {
        route: route.id,
        path: route.path,
        profile: profile.id,
        initialLcp: initial.lcp,
        ...result,
        images: result.images.map((image) => ({
          ...image,
          originalTop: round(image.originalTop),
          clientWidth: round(image.clientWidth),
          clientHeight: round(image.clientHeight),
          responseEnd: round(image.responseEnd),
          selectedWidth: selectedWidth(image.currentSrc),
          oversizeRatio:
            image.clientWidth > 0
              ? round(
                  selectedWidth(image.currentSrc) / (image.clientWidth * profile.deviceScaleFactor)
                )
              : null,
        })),
      };
      rows.push(row);
      console.log(
        `${phase} ${route.id} ${profile.id}: ${row.images
          .map(
            (image) =>
              `${image.clientWidth}px -> ${image.selectedWidth || "source"}px, ${image.encodedBodyBytes ?? "?"}B`
          )
          .join(" | ")}`
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const output = {
  experiment: "PERF-040",
  phase,
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: await (async () => {
    const packageJson = await import("puppeteer-core/package.json", { with: { type: "json" } });
    return `Detached Chrome via puppeteer-core ${packageJson.default.version}`;
  })(),
  method: {
    cache:
      "Disabled browser cache and a fresh isolated browser context for every route/profile row",
    loading:
      "Record initial viewport/LCP state, then scroll every image into view and wait for decode so lazy images are measured",
    matrix: "390x844 and 1440x1000 at DPR 1 and DPR 2",
  },
  rows,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
