import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const nextImageModule = require("next/image");
const Image = nextImageModule.default || nextImageModule;
const { getImageProps } = nextImageModule;
const nextVersion = JSON.parse(readFileSync(require.resolve("next/package.json"), "utf8")).version;
const media = "(min-width: 1280px)";
const input = {
  alt: "responsive preload reproduction",
  src: "/test.png",
  width: 800,
  height: 600,
  sizes: "(max-width: 1279px) 100vw, 762px",
  preload: true,
  preloadMedia: media,
};

const warnings = [];
const originalError = console.error;
console.error = (...parts) => warnings.push(parts.map(String).join(" "));
let html;
try {
  html = ReactDOMServer.renderToString(React.createElement(Image, input));
} finally {
  console.error = originalError;
}

const preloadTag = html.match(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*>/)?.[0];
const imageTag = html.match(/<img\b[^>]*>/)?.[0];
const publicProps = getImageProps(input).props;
let lazyCombinationError = null;
try {
  ReactDOMServer.renderToString(React.createElement(Image, { ...input, loading: "lazy" }));
} catch (error) {
  lazyCombinationError = error instanceof Error ? error.message : String(error);
}

assert.ok(preloadTag, "expected Next.js to emit an image preload");
assert.ok(imageTag, "expected Next.js to emit an img");
assert.equal(/\bmedia=/.test(preloadTag), false);
assert.equal(publicProps.preloadMedia, media);
assert.match(lazyCombinationError || "", /both "preload" and "loading='lazy'"/);

const output = {
  experiment: "PERF-042 Next.js preloadMedia gap",
  generatedAt: new Date().toISOString(),
  nextVersion,
  input,
  observed: {
    preloadTag,
    imageTag,
    preloadHasMedia: /\bmedia=/.test(preloadTag),
    unknownPropLeaksThroughGetImageProps: publicProps.preloadMedia === media,
    unknownPropWarning: warnings.find((warning) => warning.includes("preloadMedia")) || null,
    lazyCombinationError,
  },
  conclusion:
    "Next/Image emits an unconditional preload, treats preloadMedia as an unknown img prop, and rejects a lazy fallback for the layouts where a conditional preload does not match.",
};

const outputPath = path.join(root, "results", `next-${nextVersion}.json`);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
