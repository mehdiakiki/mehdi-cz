import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const nextRoot = path.resolve(process.argv[2] || "node_modules/next");

function replaceOnce(filename, before, after) {
  const absolutePath = path.join(nextRoot, filename);
  const source = readFileSync(absolutePath, "utf8");
  const first = source.indexOf(before);
  assert.notEqual(first, -1, `${filename}: patch context was not found`);
  assert.equal(
    source.indexOf(before, first + before.length),
    -1,
    `${filename}: patch context is ambiguous`
  );
  writeFileSync(absolutePath, source.replace(before, after));
}

for (const filename of [
  "dist/client/components/segment-cache/scheduler.js",
  "dist/esm/client/components/segment-cache/scheduler.js",
]) {
  const esm = filename.includes("/esm/");
  replaceOnce(
    filename,
    `        isCanceled: false,\n        fallbackRetryStatus:`,
    `        isCanceled: false,\n        routeCacheMissedWhenScheduled: ${
      esm
        ? "readRouteCacheEntry(Date.now(), key) === null"
        : "(0, _cache.readRouteCacheEntry)(Date.now(), key) === null"
    },\n        fallbackRetryStatus:`
  );
  replaceOnce(
    filename,
    `    task.fetchStrategy = fetchStrategy;\n    trackMostRecentlyHoveredLink(task);`,
    `    task.fetchStrategy = fetchStrategy;\n    task.routeCacheMissedWhenScheduled = ${
      esm
        ? "readRouteCacheEntry(Date.now(), task.key) === null"
        : "(0, _cache.readRouteCacheEntry)(Date.now(), task.key) === null"
    };\n    trackMostRecentlyHoveredLink(task);`
  );
}

replaceOnce(
  "dist/client/components/segment-cache/cache.js",
  `    const existingEntry = readRouteCacheEntry(now, key);\n    if (existingEntry !== null) {\n        return existingEntry;\n    }\n    // Create a pending entry and add it to the cache.\n    const pendingEntry = createDetachedRouteCacheEntry();\n    const varyPath = (0, _varypath.getRouteVaryPath)(key.pathname, key.search, key.nextUrl);\n    const isRevalidation = false;`,
  `    const varyPath = (0, _varypath.getRouteVaryPath)(key.pathname, key.search, key.nextUrl);\n    const isRevalidation = false;\n    const existingEntry = task.routeCacheMissedWhenScheduled ? (0, _cachemap.getFromCacheMap)(now, getCurrentRouteCacheVersion(), routeCacheMap, varyPath, isRevalidation, false) : readRouteCacheEntry(now, key);\n    if (existingEntry !== null) {\n        return existingEntry;\n    }\n    // Create a pending entry and add it to the cache.\n    const pendingEntry = createDetachedRouteCacheEntry();`
);

replaceOnce(
  "dist/esm/client/components/segment-cache/cache.js",
  `    const existingEntry = readRouteCacheEntry(now, key);\n    if (existingEntry !== null) {\n        return existingEntry;\n    }\n    // Create a pending entry and add it to the cache.\n    const pendingEntry = createDetachedRouteCacheEntry();\n    const varyPath = getRouteVaryPath(key.pathname, key.search, key.nextUrl);\n    const isRevalidation = false;`,
  `    const varyPath = getRouteVaryPath(key.pathname, key.search, key.nextUrl);\n    const isRevalidation = false;\n    const existingEntry = task.routeCacheMissedWhenScheduled ? getFromCacheMap(now, getCurrentRouteCacheVersion(), routeCacheMap, varyPath, isRevalidation, false) : readRouteCacheEntry(now, key);\n    if (existingEntry !== null) {\n        return existingEntry;\n    }\n    // Create a pending entry and add it to the cache.\n    const pendingEntry = createDetachedRouteCacheEntry();`
);

writeFileSync(
  path.join(nextRoot, "PERF046_PR_97377_APPLIED"),
  "Compiled-package adaptation of vercel/next.js PR #97377 for PERF-046 only.\n"
);
console.log(`Applied the PR #97377 behavior to ${nextRoot}`);
