import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { getImgProps } = require("next/dist/shared/lib/get-img-props");
const defaultLoader = require("next/dist/shared/lib/image-loader").default;
const { imageConfigDefault } = require("next/dist/shared/lib/image-config");
const nextVersion = require("next/package.json").version;
const experimentRoot = path.dirname(fileURLToPath(import.meta.url));

const imgConf = {
  ...imageConfigDefault,
  deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [32, 48, 64, 96, 128, 192, 256],
  qualities: [75],
};

function generate(sizes) {
  const { props } = getImgProps(
    {
      src: "/fixture.png",
      alt: "",
      width: 800,
      height: 600,
      sizes,
    },
    { defaultLoader, imgConf }
  );
  return {
    sizes,
    srcset: props.srcSet,
    candidates: props.srcSet.split(", ").length,
    srcsetBytes: Buffer.byteLength(props.srcSet),
  };
}

const rows = [
  generate("100vw"),
  generate("calc(100vw - 2rem)"),
  generate("calc( 100vw - 2rem)"),
  generate("50vw"),
  generate("min(50vw, 800px)"),
  generate("min( 50vw, 800px)"),
  generate("33.3vw"),
  generate("clamp(320px, 33.3vw, 762px)"),
];

const bySizes = new Map(rows.map((row) => [row.sizes, row]));
assert.equal(bySizes.get("100vw").candidates, 9);
assert.equal(bySizes.get("calc(100vw - 2rem)").candidates, 16);
assert.equal(bySizes.get("calc( 100vw - 2rem)").candidates, 9);
assert.equal(bySizes.get("50vw").candidates, 11);
assert.equal(bySizes.get("min(50vw, 800px)").candidates, 16);
assert.equal(bySizes.get("min( 50vw, 800px)").candidates, 11);
assert.equal(bySizes.get("33.3vw").candidates, 16);
assert.equal(bySizes.get("clamp(320px, 33.3vw, 762px)").candidates, 16);

const output = {
  experiment: "PERF-040 Next.js sizes parser reproduction",
  generatedAt: new Date().toISOString(),
  nextVersion,
  reproduced: true,
  finding:
    "Equivalent valid CSS viewport lengths produce different srcset candidate lists because Next.js only recognizes integer vw tokens preceded by whitespace or the start of the string.",
  rows,
};

const outputPath = path.join(experimentRoot, "results", "next-16.3.4.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Wrote ${outputPath}`);
