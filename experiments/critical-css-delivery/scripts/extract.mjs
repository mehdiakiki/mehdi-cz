import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import Beasties from "beasties";
import { transform } from "lightningcss";
import { buildRoot, resultsRoot, routes, sourceCssFile, sourceCssPath } from "./config.mjs";
import { pruneCriticalCss } from "./prune-critical.mjs";

const oracleRoot = `${resultsRoot}/oracle`;
await mkdir(oracleRoot, { recursive: true });

function bytes(buffer) {
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer).length,
    brotli: brotliCompressSync(buffer).length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function body(html) {
  return html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i)?.slice(1) || ["", html];
}

function composite(documents) {
  const sections = documents
    .map(({ name, html, dark = false }) => {
      const [attributes, contents] = body(html);
      return `<section data-perf051-route="${name}"${dark ? ' class="dark"' : ""}><div${attributes}>${contents}</div></section>`;
    })
    .join("");
  return `<!doctype html><html><head><link rel="stylesheet" href="${sourceCssPath}"></head><body>${sections}</body></html>`;
}

function extractStyles(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("");
}

async function processDocument(name, html) {
  const beasties = new Beasties({
    path: buildRoot,
    publicPath: "/_next/",
    preload: "swap",
    pruneSource: false,
    compress: true,
    logLevel: "silent",
  });
  const processed = await beasties.process(html);
  const extracted = Buffer.from(extractStyles(processed));
  if (!extracted.length) throw new Error(`Beasties extracted no CSS for ${name}`);
  await writeFile(`${oracleRoot}/${name}-beasties.css`, extracted);
  const pruned = pruneCriticalCss(extracted.toString(), html);
  await writeFile(`${oracleRoot}/${name}-pruned.css`, pruned.css);
  const optimized = transform({
    filename: `${name}.css`,
    code: Buffer.from(pruned.css),
    minify: true,
    sourceMap: false,
  }).code;
  await writeFile(`${oracleRoot}/${name}-lightning.css`, optimized);
  return {
    name,
    beasties: bytes(extracted),
    pruned: bytes(Buffer.from(pruned.css)),
    lightning: bytes(optimized),
    usedProperties: pruned.usedProperties,
    usedKeyframes: pruned.usedKeyframes,
  };
}

const sourceCss = await readFile(sourceCssFile);
const routeDocuments = await Promise.all(
  routes.map(async (route) => ({
    name: route.name,
    html: await readFile(resolve(buildRoot, route.html), "utf8"),
  })),
);

const rows = [];
for (const document of routeDocuments) rows.push(await processDocument(document.name, document.html));
rows.push(await processDocument("full-union", composite(routeDocuments)));

const visible = JSON.parse(await readFile(`${resultsRoot}/visible-snapshots.json`, "utf8"));
const visibleDocuments = await Promise.all(
  visible.rows.map(async (row) => ({
    name: `${row.profile}-${row.route}-${row.state}`,
    dark: row.state.includes("dark"),
    html: await readFile(resolve(resultsRoot, row.file), "utf8"),
  })),
);
rows.push(await processDocument("visible-union", composite(visibleDocuments)));

const manifest = {
  generatedAt: new Date().toISOString(),
  toolchain: { beasties: "0.4.3", lightningcss: "1.32.0" },
  build: basename(buildRoot),
  source: { path: sourceCssPath, ...bytes(sourceCss) },
  note: "Beasties is a conservative selector oracle. The dependency-aware pass removes unreferenced custom-property declarations, registrations, and keyframes before Lightning CSS minifies the result. The visible union is built from browser-pruned viewport DOM across both profiles and light/dark/search/menu states; correctness tests, not extraction alone, authorize a candidate.",
  rows,
};
await writeFile(`${resultsRoot}/extraction.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.table(rows.map((row) => ({ name: row.name, raw: row.lightning.raw, gzip: row.lightning.gzip, brotli: row.lightning.brotli })));
