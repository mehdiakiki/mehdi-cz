#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { remark } from "remark";
import {
  findHeadingOrderViolations,
  normalizeHeadingOrder,
} from "../lib/remark-normalize-heading-order.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogDirectory = path.join(repositoryRoot, "data/blog");
const shouldPrintJson = process.argv.includes("--json");
const quiet = process.argv.includes("--quiet");

const relative = (absolutePath) => path.relative(repositoryRoot, absolutePath);

function analyzeFile(absolutePath) {
  const source = readFileSync(absolutePath, "utf8");
  const content = matter(source).content;

  if (!source.endsWith(content)) {
    throw new Error(`Could not locate parsed content in ${relative(absolutePath)}`);
  }

  const contentOffset = source.length - content.length;
  const contentLineOffset = source.slice(0, contentOffset).split("\n").length - 1;
  const tree = remark().parse(content);
  const sourceViolations = findHeadingOrderViolations(tree).map((violation) => ({
    ...violation,
    line: contentLineOffset + violation.line,
  }));
  const normalization = normalizeHeadingOrder(tree);
  const renderedViolations = findHeadingOrderViolations(tree).map((violation) => ({
    ...violation,
    line: contentLineOffset + violation.line,
  }));

  return { absolutePath, sourceViolations, renderedViolations, ...normalization };
}

function audit() {
  return readdirSync(blogDirectory)
    .filter((name) => name.endsWith(".mdx"))
    .sort()
    .map((name) => analyzeFile(path.join(blogDirectory, name)));
}

function summarize(analyses) {
  const sourceViolations = analyses.flatMap((analysis) =>
    analysis.sourceViolations.map((violation) => ({
      file: relative(analysis.absolutePath),
      ...violation,
    }))
  );
  const renderedViolations = analyses.flatMap((analysis) =>
    analysis.renderedViolations.map((violation) => ({
      file: relative(analysis.absolutePath),
      ...violation,
    }))
  );

  return {
    filesScanned: analyses.length,
    headingsScanned: analyses.reduce((sum, analysis) => sum + analysis.headingsScanned, 0),
    sourceFilesWithSkippedLevels: new Set(sourceViolations.map(({ file }) => file)).size,
    sourceSkippedLevelTransitions: sourceViolations.length,
    normalizationFiles: analyses.filter((analysis) => analysis.normalizedHeadings > 0).length,
    normalizedHeadings: analyses.reduce((sum, analysis) => sum + analysis.normalizedHeadings, 0),
    renderedFilesWithSkippedLevels: new Set(renderedViolations.map(({ file }) => file)).size,
    renderedSkippedLevelTransitions: renderedViolations.length,
    sourceViolations,
    renderedViolations,
  };
}

const result = summarize(audit());
const contentlayerConfig = readFileSync(
  path.join(repositoryRoot, "contentlayer.config.ts"),
  "utf8"
);
const compilerPluginConfigured =
  contentlayerConfig.includes(
    'import remarkNormalizeHeadingOrder from "./lib/remark-normalize-heading-order.mjs"'
  ) && contentlayerConfig.includes("remarkNormalizeHeadingOrder,");
const report = { ...result, compilerPluginConfigured };

if (shouldPrintJson) {
  console.log(JSON.stringify(report, null, 2));
} else if (!quiet) {
  console.log(
    `Blog heading audit: ${result.filesScanned} files and ${result.headingsScanned} headings; ` +
      `${result.sourceSkippedLevelTransitions} source skips normalize to ${result.renderedSkippedLevelTransitions}.`
  );
  for (const violation of result.renderedViolations) {
    console.error(`${violation.file}:${violation.line} h${violation.from} -> h${violation.to}`);
  }
  if (!compilerPluginConfigured)
    console.error("The Contentlayer heading normalizer is not configured.");
}

if (!compilerPluginConfigured || result.renderedSkippedLevelTransitions > 0) process.exitCode = 1;
