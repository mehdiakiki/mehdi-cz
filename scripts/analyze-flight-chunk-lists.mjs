#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const maxRepeatedShareArgument = args.find((argument) =>
  argument.startsWith("--max-repeated-share=")
);
const maxRepeatedBytesArgument = args.find((argument) =>
  argument.startsWith("--max-repeated-bytes=")
);
const minReferenceRowsArgument = args.find((argument) =>
  argument.startsWith("--min-reference-rows=")
);
const maxRepeatedShare = maxRepeatedShareArgument
  ? Number(maxRepeatedShareArgument.split("=")[1])
  : null;
const maxRepeatedBytes = maxRepeatedBytesArgument
  ? Number(maxRepeatedBytesArgument.split("=")[1])
  : null;
const minReferenceRows = minReferenceRowsArgument
  ? Number(minReferenceRowsArgument.split("=")[1])
  : null;
const targets = args.filter((argument) => !argument.startsWith("--"));
if (targets.length === 0) {
  console.error(
    "Usage: node scripts/analyze-flight-chunk-lists.mjs [--max-repeated-share=0.02] [--max-repeated-bytes=10000] [--min-reference-rows=1] <url-or-html-file> [...]"
  );
  process.exit(1);
}

if (
  (maxRepeatedShare !== null && (!Number.isFinite(maxRepeatedShare) || maxRepeatedShare < 0)) ||
  (maxRepeatedBytes !== null && (!Number.isFinite(maxRepeatedBytes) || maxRepeatedBytes < 0)) ||
  (minReferenceRows !== null && (!Number.isInteger(minReferenceRows) || minReferenceRows < 0))
) {
  console.error("Flight chunk-list budgets must be non-negative numbers.");
  process.exit(1);
}

const pushPattern = /self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
const clientReferencePattern = /^[^:\n]+:I(\[[^\n]*\])$/gm;
const staticAssetPattern = /"([^"\\]*static\/[^"\\]*\.(?:js|css)(?:\?[^"\\]*)?)"/g;

const compressedSizes = (text) => {
  const bytes = Buffer.from(text);
  return {
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    brotliBytes: brotliCompressSync(bytes).length,
  };
};

const readTarget = async (target) => {
  if (!/^https?:\/\//.test(target)) {
    return { html: await readFile(target, "utf8"), response: null };
  }

  const response = await fetch(target, {
    headers: {
      Accept: "text/html",
      "User-Agent": "mehdi.cz-flight-chunk-audit/1.0",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { html: await response.text(), response };
};

const decodeFlight = (html) => {
  let flight = "";
  for (const match of html.matchAll(pushPattern)) {
    try {
      const entry = JSON.parse(match[1]);
      if (Array.isArray(entry) && entry[0] === 1 && typeof entry[1] === "string") {
        flight += entry[1];
      }
    } catch {
      // Bootstrap entries and malformed non-Flight scripts do not affect the count.
    }
  }
  return flight;
};

const extractReferenceLists = (flight) => {
  const lists = [];
  let referenceRows = 0;
  let parsedReferenceRows = 0;

  for (const match of flight.matchAll(clientReferencePattern)) {
    referenceRows += 1;
    try {
      const row = JSON.parse(match[1]);
      const chunks = Array.isArray(row?.[1])
        ? row[1].filter((value) => typeof value === "string" && value.includes("static/"))
        : [];
      lists.push(chunks);
      parsedReferenceRows += 1;
    } catch {
      // Keep the row in the total so a protocol-format change is visible.
    }
  }

  return { lists, parsedReferenceRows, referenceRows };
};

const byteLengthWithQuotes = (values) =>
  values.reduce((total, value) => total + Buffer.byteLength(value) + 2, 0);

const extractStaticAssetUrls = (text) =>
  [...text.matchAll(staticAssetPattern)].map((match) => match[1]);

const analyze = async (target) => {
  const { html, response } = await readTarget(target);
  const flight = decodeFlight(html);
  const { lists, parsedReferenceRows, referenceRows } = extractReferenceLists(flight);
  const urls = extractStaticAssetUrls(flight);
  const uniqueUrls = new Set(urls);
  const distinctLists = new Map();

  for (const list of lists) {
    const key = JSON.stringify(list);
    const current = distinctLists.get(key) ?? { count: 0, urls: list };
    current.count += 1;
    distinctLists.set(key, current);
  }

  const urlBytes = byteLengthWithQuotes(urls);
  const distinctListUrlBytes = [...distinctLists.values()].reduce(
    (total, item) => total + byteLengthWithQuotes(item.urls),
    0
  );
  const largestRepeatedList = [...distinctLists.values()]
    .filter((item) => item.urls.length > 0)
    .sort((left, right) => right.count - left.count)[0] ?? { count: 0, urls: [] };
  const htmlSizes = compressedSizes(html);
  const flightSizes = compressedSizes(flight);

  return {
    target,
    status: response?.status ?? null,
    nextCache: response?.headers.get("x-nextjs-cache") ?? null,
    contentEncoding: response?.headers.get("content-encoding") ?? null,
    responseContentLength: Number(response?.headers.get("content-length")) || null,
    ...htmlSizes,
    flightBytes: flightSizes.rawBytes,
    flightGzipBytes: flightSizes.gzipBytes,
    flightBrotliBytes: flightSizes.brotliBytes,
    flightShare: htmlSizes.rawBytes
      ? Number((flightSizes.rawBytes / htmlSizes.rawBytes).toFixed(4))
      : 0,
    referenceRows,
    parsedReferenceRows,
    chunkUrlStrings: urls.length,
    uniqueChunkUrls: uniqueUrls.size,
    duplicationFactor: Number((urls.length / (uniqueUrls.size || 1)).toFixed(2)),
    chunkUrlBytes: urlBytes,
    chunkUrlHtmlShare: htmlSizes.rawBytes ? Number((urlBytes / htmlSizes.rawBytes).toFixed(4)) : 0,
    distinctChunkLists: distinctLists.size,
    repeatedListUrlBytes: Math.max(0, urlBytes - distinctListUrlBytes),
    repeatedListHtmlShare: htmlSizes.rawBytes
      ? Number((Math.max(0, urlBytes - distinctListUrlBytes) / htmlSizes.rawBytes).toFixed(4))
      : 0,
    largestListReferences: largestRepeatedList.count,
    largestListChunkUrls: largestRepeatedList.urls.length,
  };
};

const results = [];
for (const target of targets) {
  try {
    results.push(await analyze(target));
  } catch (error) {
    results.push({
      target,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(results);
const budgetViolations = results.flatMap((result) => {
  if (result.error) return [];
  const violations = [];
  if (maxRepeatedShare !== null && result.repeatedListHtmlShare > maxRepeatedShare) {
    violations.push(
      `${result.target}: repeated chunk-list share ${result.repeatedListHtmlShare} exceeds ${maxRepeatedShare}`
    );
  }
  if (maxRepeatedBytes !== null && result.repeatedListUrlBytes > maxRepeatedBytes) {
    violations.push(
      `${result.target}: ${result.repeatedListUrlBytes} repeated chunk-list bytes exceeds ${maxRepeatedBytes}`
    );
  }
  if (minReferenceRows !== null && result.referenceRows < minReferenceRows) {
    violations.push(
      `${result.target}: ${result.referenceRows} client reference rows is below required minimum ${minReferenceRows}`
    );
  }
  if (result.parsedReferenceRows !== result.referenceRows) {
    violations.push(
      `${result.target}: parsed ${result.parsedReferenceRows} of ${result.referenceRows} client reference rows`
    );
  }
  return violations;
});

console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      budgets: { maxRepeatedBytes, maxRepeatedShare, minReferenceRows },
      budgetViolations,
      results,
    },
    null,
    2
  )
);

for (const violation of budgetViolations) console.error(`BUDGET FAIL ${violation}`);

if (results.some((result) => result.error) || budgetViolations.length > 0) process.exitCode = 1;
