import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const root = process.cwd();

export const routes = [
  { key: "home", pathname: "/", html: "index.html", weight: 0.25 },
  { key: "index", pathname: "/blog", html: "blog.html", weight: 0.2 },
  {
    key: "prose",
    pathname: "/blog/async-rust-libraries",
    html: "blog/async-rust-libraries.html",
    weight: 0.2,
  },
  {
    key: "code",
    pathname: "/blog/BufReader-rust",
    html: "blog/BufReader-rust.html",
    weight: 0.1,
  },
  { key: "rust", pathname: "/rust", html: "rust.html", weight: 0.1 },
  {
    key: "atlas",
    pathname: "/rust-failure-atlas",
    html: "rust-failure-atlas.html",
    weight: 0.1,
  },
  { key: "editor", pathname: "/editor", html: "editor.html", weight: 0.05 },
];

const journey = ["home", "prose", "code", "atlas"];
const pushPattern = /self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
const referencePattern = /^[^:\n]+:I(\[[^\n]*\])$/gm;
const staticAssetPattern = /"([^"\\]*static\/[^"\\]*\.(?:js|css)(?:\?[^"\\]*)?)"/g;

function decodeFlight(html) {
  let flight = "";
  for (const match of html.matchAll(pushPattern)) {
    try {
      const entry = JSON.parse(match[1]);
      if (Array.isArray(entry) && entry[0] === 1 && typeof entry[1] === "string") {
        flight += entry[1];
      }
    } catch {
      // Bootstrap and non-Flight entries are deliberately ignored.
    }
  }
  return flight;
}

function inspectFlight(html) {
  const flight = decodeFlight(html);
  const urls = [...flight.matchAll(staticAssetPattern)].map((match) => match[1]);
  const distinctLists = new Map();
  let referenceRows = 0;
  let parsedReferenceRows = 0;

  for (const match of flight.matchAll(referencePattern)) {
    referenceRows += 1;
    try {
      const row = JSON.parse(match[1]);
      const chunks = Array.isArray(row?.[1])
        ? row[1].filter((value) => typeof value === "string" && value.includes("static/"))
        : [];
      const key = JSON.stringify(chunks);
      const current = distinctLists.get(key) ?? { count: 0, urls: chunks };
      current.count += 1;
      distinctLists.set(key, current);
      parsedReferenceRows += 1;
    } catch {
      // A parser miss remains visible in parsedReferenceRows.
    }
  }

  const bytesWithQuotes = (values) =>
    values.reduce((total, value) => total + Buffer.byteLength(value) + 2, 0);
  const chunkUrlBytes = bytesWithQuotes(urls);
  const distinctListUrlBytes = [...distinctLists.values()].reduce(
    (total, item) => total + bytesWithQuotes(item.urls),
    0
  );
  const repeatedListUrlBytes = Math.max(0, chunkUrlBytes - distinctListUrlBytes);

  return {
    htmlBytes: Buffer.byteLength(html),
    flightBytes: Buffer.byteLength(flight),
    referenceRows,
    parsedReferenceRows,
    chunkUrlStrings: urls.length,
    uniqueChunkUrls: new Set(urls).size,
    repeatedListUrlBytes,
    repeatedListHtmlShare: html.length
      ? Number((repeatedListUrlBytes / Buffer.byteLength(html)).toFixed(6))
      : 0,
  };
}

function stylesheetHrefs(html) {
  return [...html.matchAll(/href="([^"]+\.css(?:\?[^"]*)?)"/g)].map((match) => match[1]);
}

function assetPath(buildDir, href) {
  const pathname = href.split("?", 1)[0];
  if (pathname.startsWith("/_next/")) {
    return path.join(buildDir, pathname.slice("/_next/".length));
  }
  if (pathname.startsWith("/")) return path.join(root, "public", pathname.slice(1));
  throw new Error(`Unsupported stylesheet URL: ${href}`);
}

async function inspectAsset(buildDir, href) {
  const bytes = await readFile(assetPath(buildDir, href));
  return {
    href,
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    brotliBytes: brotliCompressSync(bytes).length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    scope: href.startsWith("/_next/") ? "application" : "public",
  };
}

export async function inspectBuild(buildDir, metadata = {}) {
  const absoluteBuildDir = path.resolve(root, buildDir);
  const assetCache = new Map();
  const rows = [];

  for (const route of routes) {
    const htmlPath = path.join(absoluteBuildDir, "server", "app", route.html);
    const html = await readFile(htmlPath, "utf8");
    const hrefs = [...new Set(stylesheetHrefs(html))];
    const assets = [];
    for (const href of hrefs) {
      if (!assetCache.has(href)) {
        assetCache.set(href, await inspectAsset(absoluteBuildDir, href));
      }
      assets.push(assetCache.get(href));
    }
    const sum = (scope, field) =>
      assets
        .filter((asset) => !scope || asset.scope === scope)
        .reduce((total, asset) => total + asset[field], 0);

    rows.push({
      ...route,
      hrefs,
      requestCount: assets.length,
      applicationRequestCount: assets.filter((asset) => asset.scope === "application").length,
      rawBytes: sum(null, "rawBytes"),
      gzipBytes: sum(null, "gzipBytes"),
      applicationRawBytes: sum("application", "rawBytes"),
      applicationGzipBytes: sum("application", "gzipBytes"),
      flight: inspectFlight(html),
    });
  }

  const weighted = (field) =>
    Number(rows.reduce((total, row) => total + row.weight * row[field], 0).toFixed(3));
  const journeyRows = [];
  const seen = new Set();
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const key of journey) {
    const route = rows.find((row) => row.key === key);
    for (const href of route.hrefs) {
      if (seen.has(href)) continue;
      seen.add(href);
      const asset = assetCache.get(href);
      rawBytes += asset.rawBytes;
      gzipBytes += asset.gzipBytes;
    }
    journeyRows.push({ route: key, uniqueStylesheets: seen.size, rawBytes, gzipBytes });
  }

  return {
    capturedAt: new Date().toISOString(),
    buildDir,
    metadata,
    routes: rows,
    assets: [...assetCache.values()],
    summary: {
      routeWeightedRawBytes: weighted("rawBytes"),
      routeWeightedGzipBytes: weighted("gzipBytes"),
      routeWeightedApplicationRawBytes: weighted("applicationRawBytes"),
      routeWeightedApplicationGzipBytes: weighted("applicationGzipBytes"),
      routeWeightedRequestCount: weighted("requestCount"),
      medianRequestCount: [...rows].sort((left, right) => left.requestCount - right.requestCount)[
        Math.floor(rows.length / 2)
      ].requestCount,
      maxRepeatedFlightShare: Math.max(...rows.map((route) => route.flight.repeatedListHtmlShare)),
      maxRepeatedFlightBytes: Math.max(...rows.map((route) => route.flight.repeatedListUrlBytes)),
      journey: journeyRows,
      journeyThreeRouteGzipBytes: journeyRows[2].gzipBytes,
      journeyFourRouteGzipBytes: journeyRows[3].gzipBytes,
    },
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const buildDir = process.argv[2];
  const output = process.argv[3];
  if (!buildDir) throw new Error("Usage: inspect-build.mjs <build-dir> [output.json]");
  const result = await inspectBuild(buildDir);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (output) await writeFile(output, json);
  console.log(json);
}
