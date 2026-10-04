import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cacheAssets from "./generated/cache-assets.json" with { type: "json" };

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = new URL(process.env.PERF038_BASE_URL || "http://127.0.0.1:3120");

function request(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: baseUrl.hostname,
        port: baseUrl.port,
        method: "GET",
        path: pathname,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    request.on("error", reject);
    request.end();
  });
}

async function probe(policy, source, url) {
  const initial = await request(url);
  const conditionalHeaders = initial.headers.etag
    ? { "if-none-match": initial.headers.etag }
    : initial.headers["last-modified"]
      ? { "if-modified-since": initial.headers["last-modified"] }
      : {};
  const conditional = await request(url, conditionalHeaders);
  return {
    policy,
    source,
    url,
    status: initial.status,
    cacheControl: initial.headers["cache-control"] ?? null,
    etag: initial.headers.etag ?? null,
    lastModified: initial.headers["last-modified"] ?? null,
    bodyBytes: initial.body.length,
    conditionalStatus: conditional.status,
    conditionalBodyBytes: conditional.body.length,
  };
}

const sourceMapping = Object.fromEntries(
  Object.keys(cacheAssets.policies["hashed-stale"]).map((source) => [source, source])
);
const policies = {
  mutable: sourceMapping,
  "hashed-stale": cacheAssets.policies["hashed-stale"],
  "hashed-immutable": cacheAssets.policies["hashed-immutable"],
};
const resources = [];
for (const [policy, mapping] of Object.entries(policies)) {
  for (const [source, url] of Object.entries(mapping)) {
    resources.push(await probe(policy, source, url));
  }
}

for (const resource of resources) {
  assert.equal(resource.status, 200, `${resource.policy} ${resource.url}`);
  assert.equal(resource.conditionalStatus, 304, `${resource.policy} ${resource.url}`);
  assert.equal(resource.conditionalBodyBytes, 0, `${resource.policy} ${resource.url}`);
  if (resource.policy === "hashed-immutable") {
    assert.equal(resource.cacheControl, "public, max-age=31536000, immutable");
  } else {
    assert.equal(resource.cacheControl, "public, max-age=0");
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  baseUrl: baseUrl.href,
  summary: {
    resourcesPerPolicy: Object.keys(sourceMapping).length,
    mutableFreshResources: resources.filter(
      (resource) => resource.policy === "mutable" && resource.cacheControl.includes("max-age=0")
    ).length,
    hashedStaleResources: resources.filter(
      (resource) =>
        resource.policy === "hashed-stale" && resource.cacheControl.includes("max-age=0")
    ).length,
    hashedImmutableResources: resources.filter(
      (resource) =>
        resource.policy === "hashed-immutable" &&
        resource.cacheControl.includes("max-age=31536000") &&
        resource.cacheControl.includes("immutable")
    ).length,
    conditionalRequests: resources.length,
    conditional304s: resources.filter((resource) => resource.conditionalStatus === 304).length,
  },
  resources,
  interpretation:
    "Explicit conditional requests can still receive 304 responses for immutable resources; the browser navigation experiment tests whether a fresh immutable entry suppresses those requests entirely.",
};
const outputPath = path.join(fixtureRoot, "results/perf038-cache-policy.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.table(
  resources.map(({ policy, source, cacheControl, bodyBytes, conditionalStatus }) => ({
    policy,
    source,
    cacheControl,
    bodyBytes,
    conditionalStatus,
  }))
);
console.log(`Wrote ${outputPath}`);
