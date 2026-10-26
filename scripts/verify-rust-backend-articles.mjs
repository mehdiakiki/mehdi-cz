import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { missingDuePublications, parsePublicationFrontmatter } from "./check-publication-due.mjs";
import { editorialSeriesForPost } from "../data/editorial-series.mjs";
import { writingTier } from "../data/writing-tiers.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { markdownWordCount } from "./audit-authority-campaign.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/rust-backend-eight-2026-10-26.json", "utf8")
);
assert.equal(manifest.articles.length, 8);
assert.equal(new Set(manifest.articles.map((a) => a.slug)).size, 8);
function unindent(text) {
  const lines = text.replace(/^\n|\n$/g, "").split("\n");
  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length)
  );
  return lines
    .map((line) => line.slice(indentation))
    .join("\n")
    .trim();
}
const posts = [];
for (const article of manifest.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.draft, false);
  assert.equal(data.reviewed, true);
  assert.equal(data.reviewedHash, articleReviewHash(source), article.slug);
  const post = {
    ...parsePublicationFrontmatter(source),
    slug: article.slug,
    path: `/blog/${article.slug}`,
  };
  posts.push(post);
  assert.equal(post.date, article.publish_at);
  const boundary = new Date(post.date).getTime();
  assert.equal(publicationStatus(post, new Date(boundary - 1)), "scheduled");
  assert.equal(publicationStatus(post, new Date(boundary)), "published");
  assert.equal(publicationStatus({ ...post, draft: true }, new Date(boundary)), "draft");
  assert.equal(publicationStatus({ ...post, reviewed: false }, new Date(boundary)), "unapproved");
  assert.equal(editorialSeriesForPost(article.slug)?.slug, "rust-backend-in-practice");
  assert.equal(writingTier(article.slug), "article");
  assert.equal(createHash("sha256").update(source).digest("hex"), article.source_sha256);
  assert.ok(markdownWordCount(content) >= 700, article.slug);
  assert.ok(content.includes(`](/blog/${article.primary_parent_slug})`), article.slug);
  const fences = [...content.matchAll(/^```rust\n([\s\S]*?)^```/gm)];
  assert.equal(fences.length, article.snippets.length);
  for (const [index, block] of article.snippets.entries()) {
    const fixture = await readFile(block.source, "utf8");
    const marker = new RegExp(
      `^[ \\t]*// article:start ${block.label}\\n([\\s\\S]*?)^[ \\t]*// article:end ${block.label}`,
      "m"
    );
    const code = fixture.match(marker)?.[1];
    assert.ok(code, `${article.slug}: missing ${block.label}`);
    assert.equal(
      unindent(fences[index][1]),
      unindent(code),
      `${article.slug}: excerpt differs from compiled fixture`
    );
  }
  console.log(`Checked reviewed schedule and exact Rust excerpts: ${article.slug}`);
}

// Exercise the same due-path detector used by the hourly deployment workflow.
const days = new Map();
for (const post of posts)
  days.set(post.date.slice(0, 10), (days.get(post.date.slice(0, 10)) || 0) + 1);
assert.deepEqual(
  [...days],
  [
    ["2026-10-26", 2],
    ["2026-10-27", 1],
    ["2026-10-28", 1],
    ["2026-10-29", 1],
    ["2026-10-30", 1],
    ["2026-10-31", 1],
    ["2026-11-01", 1],
  ]
);
const live = [];
for (const post of posts) {
  const xml = `<urlset>${live.map((path) => `<url><loc>https://www.mehdi.cz${path}</loc></url>`).join("")}</urlset>`;
  const boundary = new Date(post.date).getTime();
  assert.deepEqual(missingDuePublications(posts, xml, new Date(boundary - 1)), []);
  assert.deepEqual(
    missingDuePublications(posts, xml, new Date(boundary)).map((item) => item.slug),
    [post.slug]
  );
  live.push(post.path);
  const updated = xml.replace(
    "</urlset>",
    `<url><loc>https://www.mehdi.cz${post.path}</loc></url></urlset>`
  );
  assert.deepEqual(missingDuePublications(posts, updated, new Date(boundary)), []);
}
console.log(
  "Checked all eight publication boundaries: not due, due and missing, then present in the sitemap."
);
