import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { buildVariant, prefixFlushOffset, routes, variants } from "./fixture.mjs";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));

function compressedSizes(html) {
  const body = Buffer.from(html);
  return {
    raw: body.length,
    gzip: zlib.gzipSync(body, { level: 6 }).length,
    brotli: zlib.brotliCompressSync(body, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

async function gzipWithFlush(html, splitAt) {
  const chunks = [];
  const gzip = zlib.createGzip({ level: 6 });
  gzip.on("data", (chunk) => chunks.push(chunk));
  const complete = new Promise((resolve, reject) => {
    gzip.on("end", resolve);
    gzip.on("error", reject);
  });
  gzip.write(html.slice(0, splitAt));
  await new Promise((resolve, reject) => {
    gzip.flush(zlib.constants.Z_SYNC_FLUSH, (error) => (error ? reject(error) : resolve()));
  });
  gzip.end(html.slice(splitAt));
  await complete;
  return Buffer.concat(chunks).length;
}

const rows = [];
for (const route of routes) {
  for (const variant of variants) {
    const html = buildVariant(route, variant);
    const sizes = compressedSizes(html);
    if (variant === "prefix-flush") {
      sizes.gzipStreamed = await gzipWithFlush(html, prefixFlushOffset(html, route.targetAlt));
    }
    rows.push({ route: route.id, variant, ...sizes });
  }
}

const outputPath = path.join(experimentRoot, "results", "perf044-artifacts.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      experiment: "PERF-044 document artifact audit",
      generatedAt: new Date().toISOString(),
      codecs: { gzip: "zlib level 6", brotli: "quality 11" },
      rows,
    },
    null,
    2
  )}\n`
);
console.table(rows);
console.log(`Wrote ${outputPath}`);
