import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { renderContentDocument } from "./lib/render-document.mjs";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(fixtureRoot, "public");
const variants = ["shared", "prerender-immediate", "prerender-dwell"];
const pages = ["home", "article"];
const scripts = {
  shared: ["hybrid/bootstrap.js"],
  "prerender-immediate": ["hybrid/bootstrap.js", "hybrid/prerender.js"],
  "prerender-dwell": ["hybrid/bootstrap.js", "hybrid/prerender.js"],
};

function size(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
}

const results = variants.flatMap((variant) =>
  pages.map((page) => {
    const html = renderContentDocument(page, variant);
    const scriptSizes = scripts[variant].map((relativePath) => ({
      path: `/${relativePath}`,
      ...size(readFileSync(path.join(publicRoot, relativePath))),
    }));
    return {
      variant,
      page,
      html: size(html),
      startupScripts: {
        requests: scriptSizes.length,
        raw: scriptSizes.reduce((total, entry) => total + entry.raw, 0),
        gzip: scriptSizes.reduce((total, entry) => total + entry.gzip, 0),
        files: scriptSizes,
      },
    };
  })
);
const shared = Object.fromEntries(
  results.filter((entry) => entry.variant === "shared").map((entry) => [entry.page, entry])
);
const comparisons = results
  .filter((entry) => entry.variant !== "shared")
  .map((entry) => ({
    before: "shared",
    after: entry.variant,
    page: entry.page,
    htmlGzipDelta: entry.html.gzip - shared[entry.page].html.gzip,
    startupScriptGzipDelta: entry.startupScripts.gzip - shared[entry.page].startupScripts.gzip,
    startupRequestDelta: entry.startupScripts.requests - shared[entry.page].startupScripts.requests,
  }));
const output = {
  generatedAt: new Date().toISOString(),
  method: "level-9 gzip over the exact default HTML and framework-free startup modules",
  results,
  comparisons,
};
writeFileSync(
  path.join(fixtureRoot, "results/prerender-artifact-measurement.json"),
  `${JSON.stringify(output, null, 2)}\n`
);

console.table(
  results.map((entry) => ({
    variant: entry.variant,
    page: entry.page,
    "HTML gzip": entry.html.gzip,
    "script requests": entry.startupScripts.requests,
    "script gzip": entry.startupScripts.gzip,
  }))
);
