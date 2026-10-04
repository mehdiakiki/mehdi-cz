import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";

import { contentClusters } from "../data/content-clusters.mjs";
import { heldArticleSlugs } from "../data/publication-hold.mjs";
import {
  articleSlugsForTheme,
  classifiedWritingSlugs,
  defaultWritingTier,
  investigationPartOf,
  investigations,
  referenceSlugsForTheme,
  writingThemeOf,
  writingThemeSlugs,
  writingThemes,
  writingTier,
} from "../data/writing-tiers.mjs";
import { selectAdjacentWriting, selectRelatedWriting } from "../lib/related-writing.mjs";

const repositoryRoot = path.resolve(".");
const blogDirectory = path.join(repositoryRoot, "data", "blog");

function frontmatter(slug) {
  const file = path.join(blogDirectory, `${slug}.mdx`);
  assert.ok(existsSync(file), `${slug} has no data/blog/${slug}.mdx`);
  return matter(readFileSync(file, "utf8")).data;
}

function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(path.join(repositoryRoot, directory), { withFileTypes: true })) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(relativePath));
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) files.push(relativePath);
  }
  return files;
}

test("every classified slug is a real article, never a note, never held", () => {
  const slugs = classifiedWritingSlugs();
  assert.equal(new Set(slugs).size, slugs.length, "a slug is classified twice");
  for (const slug of slugs) {
    const data = frontmatter(slug);
    assert.notEqual(data.format, "note", `${slug} is a note; notes are always reference`);
    assert.ok(!heldArticleSlugs.has(slug), `${slug} is on the editorial hold`);
  }
});

test("unclassified posts and notes fall back to reference, never a stronger tier", () => {
  assert.equal(defaultWritingTier, "reference");
  assert.equal(writingTier("a-post-nobody-has-classified-yet"), "reference");
  assert.equal(writingThemeOf("a-post-nobody-has-classified-yet"), undefined);
  assert.equal(writingTier({ slug: "deno_files", format: "note" }), "reference");
  assert.equal(writingTier("deno_files"), "article");
  assert.equal(writingTier("why-is-my-rust-build-slow-a-diagnostic-tree"), "investigation");
});

test("every article answers one of the four theme questions", () => {
  assert.deepEqual(
    writingThemes.map((theme) => theme.slug),
    writingThemeSlugs
  );
  for (const theme of writingThemeSlugs) {
    for (const slug of articleSlugsForTheme(theme)) {
      assert.equal(writingTier(slug), "article", slug);
      assert.equal(writingThemeOf(slug), theme, slug);
    }
    for (const slug of referenceSlugsForTheme(theme)) {
      assert.equal(writingTier(slug), "reference", slug);
    }
  }
});

test("the launch investigations are listed in order with evidence", () => {
  assert.deepEqual(
    investigations.map((investigation) => investigation.slug),
    [
      "site-performance-lab",
      "types-under-the-hood",
      "rust-build-times",
      "async-rust",
      "rust-failure-atlas",
    ]
  );

  for (const investigation of investigations) {
    assert.ok(investigation.themes.length > 0, investigation.slug);
    for (const theme of investigation.themes) {
      assert.ok(writingThemeSlugs.includes(theme), `${investigation.slug}: ${theme}`);
    }
    if (investigation.parts.length === 0) {
      assert.match(investigation.href, /^\//, `${investigation.slug} needs its own page`);
      continue;
    }
    assert.ok(investigation.parts.length > 1, `${investigation.slug} is multi-part`);
    assert.ok(
      existsSync(path.join(repositoryRoot, investigation.evidence)),
      `${investigation.slug} evidence ${investigation.evidence}`
    );
    investigation.parts.forEach((slug, index) => {
      const data = frontmatter(slug);
      assert.equal(data.draft, false, `${slug} must be released`);
      assert.equal(writingTier(slug), "investigation", slug);
      assert.equal(investigationPartOf(slug)?.index, index, slug);
    });
  }

  assert.equal(
    investigations.find((investigation) => investigation.slug === "types-under-the-hood").parts
      .length,
    10
  );
  assert.equal(
    investigations.find((investigation) => investigation.slug === "site-performance-lab").href,
    "/work/site-performance-lab"
  );
  assert.equal(
    investigations.find((investigation) => investigation.slug === "rust-failure-atlas").href,
    "/rust-failure-atlas"
  );
});

test("series start-here entries come from investigations and articles", () => {
  for (const cluster of contentClusters) {
    for (const slug of cluster.featuredSlugs) {
      assert.notEqual(writingTier(slug), "reference", `${cluster.slug} features ${slug}`);
    }
  }
});

test("public writing copy carries no campaign or production language", () => {
  const banned =
    /roadmap|campaign|two hundred|\b200\b|\bslots?\b|\bSEO\b|crawl|canonical page|search intent|—/i;
  const visibleCopy = [
    ...contentClusters.flatMap((cluster) => [
      cluster.title,
      cluster.subtitle,
      cluster.description,
      ...cluster.introduction,
      ...cluster.principles.flatMap((principle) => [principle.title, principle.description]),
      ...cluster.questions,
      cluster.cta.title,
      cluster.cta.description,
    ]),
    ...writingThemes.flatMap((theme) => [theme.label, theme.title, theme.description]),
    ...investigations.flatMap((investigation) => [investigation.title, investigation.summary]),
  ];
  for (const text of visibleCopy) assert.doesNotMatch(text, banned, text);

  const writingIndex = readFileSync("app/(site)/blog/page.tsx", "utf8");
  assert.doesNotMatch(writingIndex, /roadmap|Two hundred|featuredWriting/i);
  assert.match(writingIndex, /id="investigations"/);
  assert.match(writingIndex, /href="\/blog\/page\/1"/);
});

test("the public roadmap route is gone and nothing links to it", () => {
  assert.ok(!existsSync("app/(site)/blog/roadmap"), "remove the /blog/roadmap route");
  for (const file of [
    ...sourceFiles("app"),
    ...sourceFiles("components"),
    ...sourceFiles("layouts"),
  ]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /\/blog\/roadmap/, file);
  }
});

test("tags are no longer the archive navigation", () => {
  const layout = readFileSync("layouts/ListLayoutWithTags.tsx", "utf8");
  assert.doesNotMatch(layout, /tag-data\.json/);
  assert.match(layout, /writingThemes\.map/);
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  assert.match(sitemap, /\/blog\/themes\//);
});

const post = (slug, extra = {}) => ({
  slug,
  title: slug,
  date: "2026-09-01T00:00:00Z",
  tags: [],
  ...extra,
});

test("recommendations favour investigations and articles in the same theme", () => {
  const candidates = [
    post("hir-thir-and-mir-the-same-rust-function-at-three-compiler-stages"),
    post("rustc-defid-vs-hirid"),
    post("what-is-a-type-a-set-of-values-a-promise-about-operations-or-both"),
    post("how-async-rust-works-under-the-hood"),
    post("rust-iterators", { cluster: "rust-under-the-hood" }),
    post("cell-refcell-rust", { cluster: "rust-under-the-hood" }),
    post("when-to-advance-a-sync-checkpoint-after-partial-success"),
  ];
  const current = post("deno_files", { cluster: "rust-under-the-hood" });
  const related = selectRelatedWriting(current, [current, ...candidates]);

  assert.equal(related.length, 4);
  assert.deepEqual(
    related.slice(0, 2).map((item) => item.kind),
    ["investigation", "investigation"]
  );
  for (const item of related) {
    assert.ok(!/rust-iterators|cell-refcell-rust|deno_files/.test(item.href), item.href);
  }
  assert.ok(related.every((item) => !item.href.includes("sync-checkpoint")));
});

test("a post outside every theme and cluster is pointed at the investigations", () => {
  const candidates = [
    post("what-is-a-type-a-set-of-values-a-promise-about-operations-or-both"),
    post("how-async-rust-works-under-the-hood"),
  ];
  const related = selectRelatedWriting(post("zustand-ultimate-guide"), candidates);
  assert.ok(related.length > 0);
  assert.ok(related.every((item) => item.kind === "investigation"));
});

test("a recommendation never points at a post that was not offered as a candidate", () => {
  const current = post("deno_files", { cluster: "rust-under-the-hood" });
  const related = selectRelatedWriting(current, [current]);
  for (const item of related) {
    if (item.href.startsWith("/blog/")) {
      assert.fail(`${item.href} was not a candidate`);
    }
  }
});

test("investigation parts step through their series", () => {
  const parts = investigations.find(
    (investigation) => investigation.slug === "rust-build-times"
  ).parts;
  const peers = [post("deno_files"), ...parts.map((slug) => post(slug)), post("rust-iterators")];
  const middle = selectAdjacentWriting(post(parts[1]), peers);
  assert.equal(middle.prev.slug, parts[0]);
  assert.equal(middle.next.slug, parts[2]);
  const first = selectAdjacentWriting(post(parts[0]), peers);
  assert.equal(first.prev, undefined);
  assert.equal(first.next.slug, parts[1]);

  const articlePeers = [
    post("rustc-defid-vs-hirid"),
    post("rust-iterators"),
    post("deno_files"),
    post("never-rust"),
    post("hir-thir-and-mir-the-same-rust-function-at-three-compiler-stages"),
  ];
  const article = selectAdjacentWriting(post("deno_files"), articlePeers);
  assert.equal(article.next.slug, "rustc-defid-vs-hirid");
  assert.equal(
    article.prev.slug,
    "hir-thir-and-mir-the-same-rust-function-at-three-compiler-stages"
  );
});
