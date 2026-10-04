import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const cacheMode = process.env.PERF046_CACHE_MODE || "legacy";
const partialPrefetching = cacheMode === "partial";

if (!new Set(["legacy", "partial"]).has(cacheMode)) {
  throw new Error(`Unknown PERF046_CACHE_MODE: ${cacheMode}`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || `.next-${cacheMode}`,
  poweredByHeader: false,
  reactStrictMode: true,
  cacheComponents: partialPrefetching,
  ...(partialPrefetching ? { partialPrefetching: true } : {}),
  experimental: {
    prefetchInlining: process.env.PERF046_PREFETCH_INLINING === "false" ? false : true,
  },
  turbopack: {
    root: fixtureRoot,
  },
};

export default nextConfig;
