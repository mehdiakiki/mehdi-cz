import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import matter from "gray-matter";
import {
  CONTENT_FORMATS,
  filterNotePosts,
  filterWritingPosts,
  isNotePost,
} from "../lib/content-format.mjs";
import { publicationStatus } from "../lib/publication.mjs";

const blogDirectory = path.resolve("data/blog");
const blogRoutes = new Set(["page", "tags", "themes", "topics"]);
const knownEarlyLinks = new Set([
  "when-relaxed-atomics-are-enough-and-what-they-never-guarantee -> release-sequences-in-rust-the-rule-behind-a-surprising-acquire-load",
  "what-schema-registry-compatibility-modes-actually-protect -> unknown-fields-are-the-quiet-engine-of-protobuf-evolution",
  "a-canonical-id-is-an-internal-promise-not-a-provider-id -> entity-resolution-before-machine-learning-exact-normalized-and-reviewed-matches",
  "why-semantic-versioning-does-not-describe-data-compatibility -> null-missing-empty-and-default-are-four-different-data-states",
  "validating-a-knowledge-graph-at-its-product-boundary -> migrating-an-ontology-without-rewriting-reality-in-place",
]);

function blogArticles() {
  return readdirSync(blogDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const source = readFileSync(path.join(blogDirectory, file), "utf8");
      const parsed = matter(source);
      return { file, source, data: parsed.data, content: parsed.content };
    });
}

function duplicateMetadata(articles, field) {
  const occurrences = new Map();

  for (const article of articles) {
    const value = article.data[field];
    if (typeof value !== "string" || value.trim() === "") continue;

    const normalized = value.trim().toLocaleLowerCase("en");
    const files = occurrences.get(normalized) ?? [];
    files.push(article.file);
    occurrences.set(normalized, files);
  }

  return [...occurrences.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([value, files]) => `${JSON.stringify(value)}: ${files.join(", ")}`);
}

test("blog articles contain one frontmatter title and no repeated metadata blocks", () => {
  const malformed = blogArticles()
    .filter(({ source }) => (source.match(/^title:/gm) ?? []).length !== 1)
    .map(({ file }) => file);

  assert.deepEqual(malformed, []);
});

test("blog article titles and summaries are unique", () => {
  const articles = blogArticles();

  assert.deepEqual(duplicateMetadata(articles, "title"), []);
  assert.deepEqual(duplicateMetadata(articles, "summary"), []);
});

test("titles and summaries do not contain XML-invalid control characters", () => {
  const invalidMetadata = blogArticles().flatMap(({ file, data }) =>
    ["title", "summary"]
      .filter(
        (field) =>
          typeof data[field] === "string" &&
          /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data[field])
      )
      .map((field) => `${file}: ${field}`)
  );

  assert.deepEqual(invalidMetadata, []);
});

test("content formats separate notes from long-form writing", () => {
  const posts = [
    { slug: "deep-dive", format: "article" },
    { slug: "default-article" },
    { slug: "quick-reference", format: "note" },
  ];

  assert.equal(isNotePost(posts[2]), true);
  assert.deepEqual(
    filterNotePosts(posts).map((post) => post.slug),
    ["quick-reference"]
  );
  assert.deepEqual(
    filterWritingPosts(posts).map((post) => post.slug),
    ["deep-dive", "default-article"]
  );
});

test("note metadata is valid and cannot overlap the authority campaign", () => {
  const articles = blogArticles();
  const invalidFormats = articles
    .filter(({ data }) => data.format && !CONTENT_FORMATS.has(data.format))
    .map(({ file }) => file);
  const campaignNotes = articles
    .filter(({ data }) => data.format === "note" && (data.cluster || data.campaign))
    .map(({ file }) => file);

  assert.deepEqual(invalidFormats, []);
  assert.deepEqual(campaignNotes, []);
});

test("existing short TIL entries are explicitly classified as notes", () => {
  const unclassified = blogArticles()
    .filter(({ data, content }) => {
      const tags = (data.tags ?? []).map((tag) => String(tag).toLocaleLowerCase("en"));
      const bodyWords = content.match(/[A-Za-z0-9][A-Za-z0-9_-]*/g)?.length ?? 0;

      return (
        data.draft !== true &&
        (tags.includes("til") || tags.includes("today-i-learned")) &&
        bodyWords < 300 &&
        data.format !== "note"
      );
    })
    .map(({ file }) => file);

  assert.deepEqual(unclassified, []);
});

test("articles only link to articles that are live by the time they are", () => {
  const now = Date.now();
  const articles = blogArticles().map((article) => ({
    ...article,
    slug: article.file.replace(/\.mdx$/, ""),
  }));
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  const isOnCalendar = (article) =>
    ["published", "scheduled"].includes(
      publicationStatus({ ...article.data, slug: article.slug }, new Date(now))
    );

  const earlyLinks = articles.filter(isOnCalendar).flatMap((article) => {
    const liveFrom = Math.max(new Date(article.data.date).getTime(), now);

    return [...article.content.matchAll(/(?:\]\(|href=["'])\/blog\/([a-z0-9-]+)/g)]
      .map((match) => match[1])
      .filter((target) => !blogRoutes.has(target))
      .filter((target) => {
        const linked = bySlug.get(target);
        return (
          !linked || !isOnCalendar(linked) || new Date(linked.data.date).getTime() > liveFrom
        );
      })
      .map((target) => `${article.slug} -> ${target}`)
      .filter((link) => !knownEarlyLinks.has(link));
  });

  assert.deepEqual(earlyLinks, []);
});
