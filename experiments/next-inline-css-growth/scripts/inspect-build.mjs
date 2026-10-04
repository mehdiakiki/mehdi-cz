#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(experimentRoot, "../..");
const outputPath = path.join(experimentRoot, "results/perf048-build-analysis.json");

const builds = [
  { id: "external", root: path.join(repositoryRoot, ".next-perf048-external") },
  { id: "inline", root: path.join(repositoryRoot, ".next-perf048-inline") },
];

const routes = [
  { id: "home", artifact: "server/app/index.html" },
  {
    id: "article",
    artifact: "server/app/blog/load-balancer-sticky-sessions-course.html",
  },
];

const compressedSizes = (buffer) => ({
  rawBytes: buffer.byteLength,
  gzipBytes: gzipSync(buffer, { level: 9 }).byteLength,
  brotliBytes: brotliCompressSync(buffer, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).byteLength,
});

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function inspectTree(build) {
  const appRoot = path.join(build.root, "server/app");
  const files = await walk(appRoot);
  const rows = await Promise.all(
    files.map(async (file) => ({
      relative: path.relative(appRoot, file),
      bytes: (await stat(file)).size,
    }))
  );
  const summarize = (selected) => ({
    count: selected.length,
    rawBytes: selected.reduce((sum, file) => sum + file.bytes, 0),
  });
  return {
    all: summarize(rows),
    html: summarize(rows.filter((file) => file.relative.endsWith(".html"))),
    rsc: summarize(rows.filter((file) => file.relative.endsWith(".rsc"))),
    segmentRsc: summarize(
      rows.filter((file) => file.relative.includes(".segments/") && file.relative.endsWith(".rsc"))
    ),
    indexSegmentRsc: summarize(
      rows.filter((file) => file.relative.endsWith("/_index.segment.rsc"))
    ),
  };
}

function extractCssReferences(html) {
  const stylesheetLinks = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map(
    ([tag]) => tag.match(/\bhref="([^"]+)"/)?.[1]
  );
  const inlineStyles = [...html.matchAll(/<style\b[^>]*\bdata-href="([^"]+)"[^>]*>/g)].flatMap(
    (match) => match[1].split(/\s+/)
  );
  return { stylesheetLinks: stylesheetLinks.filter(Boolean), inlineStyles };
}

async function inspectRoute(build, route) {
  const htmlBuffer = await readFile(path.join(build.root, route.artifact));
  const html = htmlBuffer.toString("utf8");
  const cssReferences = extractCssReferences(html);
  const references = [...cssReferences.stylesheetLinks, ...cssReferences.inlineStyles];
  const cssAssets = await Promise.all(
    references.map(async (href) => {
      const buffer = await readFile(path.join(build.root, href.replace(/^\/_next\//, "")));
      return { href, sha256: sha256(buffer), ...compressedSizes(buffer) };
    })
  );
  return {
    route: route.id,
    html: { sha256: sha256(htmlBuffer), ...compressedSizes(htmlBuffer) },
    stylesheetLinkCount: cssReferences.stylesheetLinks.length,
    inlineStyleCount: cssReferences.inlineStyles.length,
    cssAssets,
  };
}

const routeRows = [];
const treeRows = [];
for (const build of builds) {
  treeRows.push({ build: build.id, ...(await inspectTree(build)) });
  for (const route of routes) {
    routeRows.push({ build: build.id, ...(await inspectRoute(build, route)) });
  }
}

const treeExternal = treeRows.find((row) => row.build === "external");
const treeInline = treeRows.find((row) => row.build === "inline");
const delta = (inline, external) => ({
  rawBytes: inline.rawBytes - external.rawBytes,
  percent: Number((((inline.rawBytes - external.rawBytes) / external.rawBytes) * 100).toFixed(1)),
  count: inline.count - external.count,
});

const routeDeltas = routes.map((route) => {
  const external = routeRows.find((row) => row.build === "external" && row.route === route.id);
  const inline = routeRows.find((row) => row.build === "inline" && row.route === route.id);
  return {
    route: route.id,
    htmlInlineMinusExternal: {
      rawBytes: inline.html.rawBytes - external.html.rawBytes,
      gzipBytes: inline.html.gzipBytes - external.html.gzipBytes,
      brotliBytes: inline.html.brotliBytes - external.html.brotliBytes,
    },
  };
});

const screenshotPairs = await Promise.all(
  routes.map(async (route) => {
    const external = await readFile(
      path.join(experimentRoot, `results/screenshots/${route.id}-external.png`)
    );
    const inline = await readFile(
      path.join(experimentRoot, `results/screenshots/${route.id}-inline.png`)
    );
    return {
      route: route.id,
      externalSha256: sha256(external),
      inlineSha256: sha256(inline),
      exactMatch: external.equals(inline),
    };
  })
);

assert.ok(
  routeRows.filter((row) => row.build === "external").every((row) => row.stylesheetLinkCount > 0),
  "external build retains stylesheet links"
);
assert.ok(
  routeRows
    .filter((row) => row.build === "inline")
    .every((row) => row.stylesheetLinkCount === 0 && row.inlineStyleCount > 0),
  "inline build replaces route stylesheet links with style tags"
);
assert.ok(
  screenshotPairs.every((pair) => pair.exactMatch),
  "both route screenshots match exactly"
);
assert.equal(
  treeInline.indexSegmentRsc.count - treeExternal.indexSegmentRsc.count,
  treeExternal.html.count - 1,
  "inline build adds an index segment for every prerendered HTML page except the root index"
);

const result = {
  experiment: "PERF-048",
  inspectedAt: new Date().toISOString(),
  builds: builds.map((build) => ({
    id: build.id,
    root: path.relative(repositoryRoot, build.root),
  })),
  routeRows,
  routeDeltas,
  treeRows,
  treeDelta: {
    all: delta(treeInline.all, treeExternal.all),
    html: delta(treeInline.html, treeExternal.html),
    rsc: delta(treeInline.rsc, treeExternal.rsc),
    segmentRsc: delta(treeInline.segmentRsc, treeExternal.segmentRsc),
    indexSegmentRsc: delta(treeInline.indexSegmentRsc, treeExternal.indexSegmentRsc),
  },
  screenshotPairs,
};

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ routeDeltas, treeDelta: result.treeDelta, screenshotPairs }, null, 2));
