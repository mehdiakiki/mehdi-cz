import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.PERF037_BASE_URL || "http://localhost:3120";
const paths = [
  "/generated/media/5a0c43ffa288c21a-s.p.woff2",
  "/generated/shared/base.css",
  "/hybrid/bootstrap.js",
  "/hybrid/prerender.js",
  "/site.webmanifest",
];

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = http.get(url, { headers }, (response) => {
      let bodyBytes = 0;
      response.on("data", (chunk) => {
        bodyBytes += chunk.length;
      });
      response.on("end", () =>
        resolve({ status: response.statusCode, headers: response.headers, bodyBytes })
      );
    });
    outgoing.on("error", reject);
  });
}

const resources = [];
for (const resourcePath of paths) {
  const url = new URL(resourcePath, baseUrl);
  const first = await request(url, { "accept-encoding": "gzip" });
  const etag = first.headers.etag;
  const lastModified = first.headers["last-modified"];
  const conditional = await request(url, {
    "accept-encoding": "gzip",
    ...(etag ? { "if-none-match": etag } : {}),
    ...(lastModified ? { "if-modified-since": lastModified } : {}),
  });
  resources.push({
    path: resourcePath,
    initialStatus: first.status,
    compressedBodyBytes: first.bodyBytes,
    cacheControl: first.headers["cache-control"],
    etag,
    lastModified,
    conditionalStatus: conditional.status,
    conditionalBodyBytes: conditional.bodyBytes,
  });
}

const output = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  resources,
  summary: {
    resources: resources.length,
    maxAgeZero: resources.filter((resource) => resource.cacheControl === "public, max-age=0")
      .length,
    conditional304: resources.filter((resource) => resource.conditionalStatus === 304).length,
    compressedBytesAvoidedByValidation: resources.reduce(
      (sum, resource) => sum + resource.compressedBodyBytes,
      0
    ),
  },
  limitation:
    "This records the fixture-local Next.js server policy; deployment/CDN overrides require a separate hostname trace.",
};
const outputPath = path.join(fixtureRoot, "results/perf037-cache-clue.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(resources);
console.log(`Wrote ${outputPath}`);
