import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const polyfillMode = process.env.POLYFILL_MODE || "baseline";

export default {
  distDir: polyfillMode === "url-only" ? ".next-url-only" : ".next-baseline",
  outputFileTracingRoot: fixtureRoot,
  webpack(config, { isServer, webpack }) {
    if (!isServer && polyfillMode === "url-only") {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /[/\\]build[/\\]polyfills[/\\]polyfill-module(?:\.js)?$/,
          path.join(fixtureRoot, "url-can-parse-only.js")
        )
      );
    }
    return config;
  },
};
