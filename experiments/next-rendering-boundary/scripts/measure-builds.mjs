import { readFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builds = [
  { bundler: "turbopack", distDir: ".next-turbo" },
  { bundler: "webpack", distDir: ".next-webpack" },
];
const routes = [
  { route: "/server", artifact: "server.html", rsc: "server.rsc" },
  { route: "/client-props", artifact: "client-props.html", rsc: "client-props.rsc" },
  { route: "/client-fetch", artifact: "client-fetch.html", rsc: "client-fetch.rsc" },
  { route: "/document", artifact: "document.body" },
  { route: "/records", artifact: "records.body" },
];

const inlineFlightPattern = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
const assetPattern = /\/_next\/static\/(?:chunks|css)\/[A-Za-z0-9_./-]+\.(?:js|css)/g;

const decodeFlight = (html) =>
  [...html.matchAll(inlineFlightPattern)].map((match) => JSON.parse(match[1])).join("");

const countMatches = (text, pattern) => text.match(pattern)?.length ?? 0;
const uniqueMatches = (text, pattern) => [...new Set(text.match(pattern) ?? [])];

const compressedSizes = (bytes) => ({
  rawBytes: bytes.length,
  gzipBytes: gzipSync(bytes, { level: 9 }).length,
  brotliBytes: brotliCompressSync(bytes).length,
});

const measureAssets = async (distDir, html) => {
  const urls = uniqueMatches(html, assetPattern);
  const assets = await Promise.all(
    urls.map(async (url) => {
      const relativePath = url.replace("/_next/static/", "");
      const bytes = await readFile(path.join(fixtureRoot, distDir, "static", relativePath));
      return { url, ...compressedSizes(bytes) };
    })
  );

  return {
    assetReferences: countMatches(html, assetPattern),
    uniqueAssets: assets.length,
    assetRawBytes: assets.reduce((total, asset) => total + asset.rawBytes, 0),
    assetGzipBytes: assets.reduce((total, asset) => total + asset.gzipBytes, 0),
    assetBrotliBytes: assets.reduce((total, asset) => total + asset.brotliBytes, 0),
  };
};

const results = [];
for (const { bundler, distDir } of builds) {
  for (const { route, artifact, rsc } of routes) {
    const artifactPath = path.join(fixtureRoot, distDir, "server", "app", artifact);
    const bytes = await readFile(artifactPath);
    const text = bytes.toString("utf8");
    const flight = rsc ? decodeFlight(text) : "";
    const rscBytes = rsc
      ? await readFile(path.join(fixtureRoot, distDir, "server", "app", rsc))
      : Buffer.alloc(0);
    const flightAssetUrls = uniqueMatches(flight, assetPattern);
    const rscSizes = rsc ? compressedSizes(rscBytes) : null;
    const recordMarkers = countMatches(text, /RBD-\d{4}-[a-z0-9]+/g);
    const flightMarkers = countMatches(flight, /RBD-\d{4}-[a-z0-9]+/g);

    results.push({
      bundler,
      route,
      ...compressedSizes(bytes),
      rscBytes: rscBytes.length,
      rscGzipBytes: rscSizes?.gzipBytes ?? 0,
      rscBrotliBytes: rscSizes?.brotliBytes ?? 0,
      decodedInlineFlightBytes: Buffer.byteLength(flight),
      flightShare: bytes.length ? Number((Buffer.byteLength(flight) / bytes.length).toFixed(3)) : 0,
      recordMarkers,
      markupMarkers: route === "/records" ? 0 : recordMarkers - flightMarkers,
      flightMarkers,
      renderedArticles: countMatches(text, /<article(?: |>\n)/g),
      flightAssetReferences: countMatches(flight, assetPattern),
      uniqueFlightAssets: flightAssetUrls.length,
      flightAssetUrlBytes: (flight.match(assetPattern) ?? []).reduce(
        (total, url) => total + Buffer.byteLength(url),
        0
      ),
      ...(route === "/records" ? {} : await measureAssets(distDir, text)),
    });
  }
}

console.table(results);
console.log(JSON.stringify({ next: "16.3.4", react: "19.2.8", results }, null, 2));
