import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { applyNextSupportedBrowserPolyfills } = require(
  "../../lib/next-supported-browser-polyfills-webpack.js"
);
const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

export default {
  distDir:
    process.env.PERF029_PATCHED_NEXT === "1" ? ".next-patched" : ".next",
  outputFileTracingRoot: fixtureRoot,
  poweredByHeader: false,
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 80, 85, 90],
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      applyNextSupportedBrowserPolyfills(config, webpack);
    }
    return config;
  },
};
