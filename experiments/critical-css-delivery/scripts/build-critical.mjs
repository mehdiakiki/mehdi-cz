import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { transform } from "lightningcss";
import postcss from "postcss";
import { resultsRoot, sourceCssFile } from "./config.mjs";
import { pruneCriticalCss } from "./prune-critical.mjs";

const assetsRoot = `${resultsRoot}/assets`;
await mkdir(assetsRoot, { recursive: true });

function bytes(buffer) {
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer).length,
    brotli: brotliCompressSync(buffer).length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function intersects(node, ranges) {
  const start = node.source?.start?.offset;
  const inclusiveEnd = node.source?.end?.offset;
  if (start === undefined || inclusiveEnd === undefined) return false;
  const end = inclusiveEnd + 1;
  return ranges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart);
}

const sourceCss = await readFile(sourceCssFile, "utf8");
const documentCoverage = JSON.parse(
  await readFile(`${resultsRoot}/full-css-coverage.json`, "utf8")
);
const viewportCoverage = JSON.parse(await readFile(`${resultsRoot}/css-coverage.json`, "utf8"));
const html = (
  await Promise.all(
    JSON.parse(await readFile(`${resultsRoot}/visible-snapshots.json`, "utf8")).rows.map((row) =>
      readFile(`${resultsRoot}/${row.file}`, "utf8")
    )
  )
).join("");

async function buildCandidate(name, rows) {
  const uniqueRanges = [
    ...new Map(rows.flatMap((row) => row.ranges).map((range) => [range.join(":"), range])).values(),
  ];
  // CDP reports both a matched leaf rule and each enclosing layer/media rule. A
  // broad parent range would retain nearly the full sheet, so only terminal
  // ranges participate in the selector census; PostCSS restores their ancestors.
  const ranges = uniqueRanges.filter(
    ([start, end]) =>
      !uniqueRanges.some(
        ([candidateStart, candidateEnd]) =>
          candidateStart >= start &&
          candidateEnd <= end &&
          (candidateStart > start || candidateEnd < end)
      )
  );
  const root = postcss.parse(sourceCss);
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name.endsWith("keyframes")) return;
    if (!intersects(rule, ranges)) rule.remove();
  });
  const selected = pruneCriticalCss(root.toString(), html);
  const optimized = transform({
    filename: `${name}.css`,
    code: Buffer.from(selected.css),
    minify: true,
    sourceMap: false,
  }).code;
  await writeFile(`${assetsRoot}/${name}.css`, optimized);
  return {
    name,
    coverageRows: rows.length,
    reportedRanges: uniqueRanges.length,
    usedRanges: ranges.length,
    usedProperties: selected.usedProperties,
    usedKeyframes: selected.usedKeyframes,
    bytes: bytes(optimized),
  };
}

const documentInitialRows = documentCoverage.rows.filter((row) => row.state.startsWith("initial-"));
const viewportInitialRows = viewportCoverage.rows.filter((row) => row.state.startsWith("initial-"));
const candidates = [
  await buildCandidate("shared-document", documentInitialRows),
  await buildCandidate("shared-initial", viewportInitialRows),
  await buildCandidate("shared-states", viewportCoverage.rows),
];
for (const route of new Set(documentCoverage.rows.map((row) => row.route))) {
  candidates.push(
    await buildCandidate(
      `${route}-document`,
      documentInitialRows.filter((row) => row.route === route)
    )
  );
  candidates.push(
    await buildCandidate(
      `${route}-initial`,
      viewportInitialRows.filter((row) => row.route === route)
    )
  );
}
const critical = candidates.find((candidate) => candidate.name === "shared-initial");
await writeFile(`${assetsRoot}/critical.css`, await readFile(`${assetsRoot}/shared-initial.css`));

const manifest = {
  generatedAt: new Date().toISOString(),
  source: bytes(Buffer.from(sourceCss)),
  candidates,
  critical: critical.bytes,
};
await writeFile(`${resultsRoot}/critical.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.table([
  { name: "source", ...manifest.source },
  ...candidates.map((candidate) => ({ name: candidate.name, ...candidate.bytes })),
]);
