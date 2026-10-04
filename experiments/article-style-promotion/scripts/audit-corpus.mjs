#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { remark } from "remark";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

import { publicationStatus } from "../../../lib/publication.mjs";

const experimentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(experimentRoot, "../..");
const contentRoot = path.join(repositoryRoot, "data/blog");
const outputPath = path.join(experimentRoot, "results/corpus-audit.json");
const now = new Date(process.env.PERF049_NOW || Date.now());
const parser = remark().use(remarkMath);

function firstNode(nodes) {
  return nodes.toSorted(
    (left, right) => left.position.start.offset - right.position.start.offset
  )[0];
}

function summarizeNode(node) {
  if (!node) return null;
  return {
    type: node.type,
    line: node.position.start.line,
    column: node.position.start.column,
    offset: node.position.start.offset,
  };
}

const fileNames = (await readdir(contentRoot))
  .filter((fileName) => /\.mdx?$/.test(fileName))
  .toSorted();
const posts = [];

for (const fileName of fileNames) {
  const source = await readFile(path.join(contentRoot, fileName), "utf8");
  const parsed = matter(source);
  const tree = parser.runSync(parser.parse(parsed.content));
  const codeNodes = [];
  const mathNodes = [];

  visit(tree, "code", (node) => codeNodes.push(node));
  visit(tree, ["math", "inlineMath"], (node) => mathNodes.push(node));

  const firstCode = firstNode(codeNodes);
  const firstMath = firstNode(mathNodes);
  const firstRelevant = firstNode([...codeNodes, ...mathNodes]);

  posts.push({
    fileName,
    slug: parsed.data.slug || fileName.replace(/\.mdx?$/, ""),
    status: publicationStatus(parsed.data, now),
    layout: parsed.data.layout || "PostLayout",
    sourceBytes: Buffer.byteLength(parsed.content),
    codeBlocks: codeNodes.length,
    mathNodes: mathNodes.length,
    firstCode: summarizeNode(firstCode),
    firstMath: summarizeNode(firstMath),
    firstRelevant: summarizeNode(firstRelevant),
  });
}

const published = posts.filter((post) => post.status === "published");
const categories = {
  neither: published.filter((post) => post.codeBlocks === 0 && post.mathNodes === 0),
  codeOnly: published.filter((post) => post.codeBlocks > 0 && post.mathNodes === 0),
  mathOnly: published.filter((post) => post.codeBlocks === 0 && post.mathNodes > 0),
  codeAndMath: published.filter((post) => post.codeBlocks > 0 && post.mathNodes > 0),
};
const byLayout = Object.fromEntries(
  Object.entries(Object.groupBy(published, (post) => post.layout)).map(([layout, matches]) => [
    layout,
    matches.length,
  ])
);
const earliestRelevant = published
  .filter((post) => post.firstRelevant)
  .toSorted((left, right) => left.firstRelevant.offset - right.firstRelevant.offset)
  .slice(0, 25);

const result = {
  experiment: "PERF-049",
  capturedAt: new Date().toISOString(),
  publicationCutoff: now.toISOString(),
  methodology:
    "Parse current MDX sources with the same remark-math grammar used by Contentlayer; count fenced code and parsed math nodes after production publication gates.",
  totals: {
    sourceFiles: posts.length,
    published: published.length,
    unpublished: posts.length - published.length,
    neither: categories.neither.length,
    codeOnly: categories.codeOnly.length,
    mathOnly: categories.mathOnly.length,
    codeAndMath: categories.codeAndMath.length,
    needsPrism: published.filter((post) => post.codeBlocks > 0).length,
    needsKatex: published.filter((post) => post.mathNodes > 0).length,
  },
  byLayout,
  mathPosts: published.filter((post) => post.mathNodes > 0),
  postsWithoutEither: categories.neither.map(({ fileName, slug }) => ({ fileName, slug })),
  earliestRelevant,
  posts,
};

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify({ totals: result.totals, byLayout, mathPosts: result.mathPosts }, null, 2)
);
console.log(`Wrote ${path.relative(repositoryRoot, outputPath)}`);
