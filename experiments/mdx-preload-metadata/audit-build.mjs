import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(experimentRoot, "../..");
const variant = process.env.PERF043_PRELOAD_VARIANT || "full";
const routes = [
  {
    id: "control-plane",
    slug: "design-control-plane-distributed-database",
    source: "/static/images/system-design-db-control-pane.webp",
  },
  {
    id: "load-balancer",
    slug: "load-balancer-sticky-sessions-course",
    source: "/static/images/stick-sessions-load-balancer.webp",
  },
];

function compressedBytes(value) {
  const input = Buffer.from(value);
  return {
    raw: input.byteLength,
    gzip: gzipSync(input, { level: 9 }).byteLength,
    brotli: brotliCompressSync(input, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).byteLength,
  };
}

function decodeAttribute(value = "") {
  return decodeURIComponent(value.replaceAll("&amp;", "&").replaceAll("&quot;", '"'));
}

function attribute(markup, name) {
  return decodeAttribute(markup.match(new RegExp(`${name}="([^"]*)"`))?.[1]);
}

const results = routes.map((route) => {
  const prefix = path.join(repositoryRoot, ".next/server/app/blog", route.slug);
  const html = readFileSync(`${prefix}.html`, "utf8");
  const rsc = readFileSync(`${prefix}.rsc`, "utf8");
  const imagePreloads =
    html.match(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*\/>/g) || [];
  const targetPreload = imagePreloads.find((link) => decodeAttribute(link).includes(route.source));
  const imageSrcSet = targetPreload ? attribute(targetPreload, "imageSrcSet") : "";
  const widths = [...imageSrcSet.matchAll(/\s(\d+)w(?:,|$)/g)].map((match) => Number(match[1]));

  if (variant === "none") assert.equal(targetPreload, undefined);
  else assert.ok(targetPreload, `${route.id}: missing target preload in production HTML`);

  return {
    id: route.id,
    slug: route.slug,
    source: route.source,
    document: compressedBytes(html),
    flight: compressedBytes(rsc),
    preload: targetPreload
      ? {
          ...compressedBytes(targetPreload),
          media: attribute(targetPreload, "media"),
          imageSizes: attribute(targetPreload, "imageSizes"),
          widths,
          candidateCount: widths.length,
        }
      : null,
  };
});

const output = {
  experiment: "PERF-043 production responsive-preload metadata",
  generatedAt: new Date().toISOString(),
  variant,
  compression:
    "Node zlib gzip level 9 and Brotli quality 11 over exact Next.js production artifacts",
  results,
};

const outputPath = path.join(experimentRoot, "results", `perf043-${variant}-artifacts.json`);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
