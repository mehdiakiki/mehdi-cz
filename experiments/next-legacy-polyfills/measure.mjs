import { readFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const legacyPatterns = [
  ["String.prototype.trimStart", /trimStart["']?\s*in String\.prototype/],
  ["String.prototype.trimEnd", /trimEnd["']?\s*in String\.prototype/],
  ["Array.prototype.flat", /Array\.prototype\.flat/],
  ["Array.prototype.flatMap", /Array\.prototype\.flatMap/],
  ["Object.fromEntries", /Object\.fromEntries/],
  ["Array.prototype.at", /Array\.prototype\.at/],
  ["Object.hasOwn", /Object\.hasOwn/],
];

async function measureBuild(distDir) {
  const html = await readFile(path.join(distDir, "server/app/index.html"), "utf8");
  const tags = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*>/g)]
    .map((match) => ({ tag: match[0], url: match[1] }))
    .filter(({ tag }) => !tag.includes("noModule"));
  const urls = [...new Set(tags.map(({ url }) => url))];
  const scripts = await Promise.all(
    urls.map(async (url) => {
      const file = path.join(distDir, url.replace("/_next/", ""));
      return { url, source: await readFile(file, "utf8") };
    })
  );
  const source = scripts.map((script) => script.source).join("\n");
  const encoded = scripts.map((script) => Buffer.from(script.source));
  return {
    requests: scripts.length,
    raw: encoded.reduce((total, buffer) => total + buffer.length, 0),
    gzip: encoded.reduce((total, buffer) => total + gzipSync(buffer, { level: 9 }).length, 0),
    brotli: encoded.reduce((total, buffer) => total + brotliCompressSync(buffer).length, 0),
    legacyMatches: legacyPatterns
      .filter(([, expression]) => expression.test(source))
      .map(([name]) => name),
    hasUrlCanParseFallback: /canParse["']?\s*in URL/.test(source),
  };
}

const baseline = await measureBuild(".next-baseline");
const urlOnly = await measureBuild(".next-url-only");
const delta = Object.fromEntries(
  ["requests", "raw", "gzip", "brotli"].map((key) => [key, urlOnly[key] - baseline[key]])
);

console.log(JSON.stringify({ baseline, urlOnly, delta }, null, 2));
