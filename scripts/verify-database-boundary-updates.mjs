import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { writingThemeOf, writingTier } from "../data/writing-tiers.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const release = JSON.parse(
  await readFile("docs/editorial/database-boundary-updates-2026-10-31.json", "utf8")
);
assert.equal(release.author, "Mehdi Akiki");
assert.deepEqual(release.articles.map((article) => article.slug), [
  "why-postgresql-stopped-using-the-index",
  "rust-timeout-does-not-stop-postgresql-query",
  "caching-ai-results-requires-an-identity-and-freshness-model",
]);
const fixture = await readFile(release.fixture.path, "utf8");
assert.equal(createHash("sha256").update(fixture).digest("hex"), release.fixture.sourceHash);

function unindent(code) {
  const lines = code.trimEnd().replace(/^\n/, "").split("\n");
  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length)
  );
  return lines.map((line) => line.slice(indentation)).join("\n");
}

for (const article of release.articles) {
  assert.equal(article.path, `data/blog/${article.slug}.mdx`);
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.date, article.date);
  assert.equal(data.lastmod, article.lastmod);
  assert.ok(Date.parse(data.lastmod) >= Date.parse(data.date));
  assert.equal(data.draft, false);
  assert.equal(data.reviewed, true);
  assert.deepEqual(data.authors, ["default"]);
  assert.equal(articleReviewHash(source), article.reviewedHash);
  assert.equal(data.reviewedHash, article.reviewedHash);
  assert.equal(createHash("sha256").update(source).digest("hex"), article.sourceHash);
  assert.match(article.previousReviewedHash, /^[a-f0-9]{64}$/);
  assert.equal(writingTier(article.slug), "article");
  assert.equal(writingThemeOf(article.slug), article.theme);
  const boundary = new Date(data.date);
  assert.equal(publicationStatus(data, new Date(boundary.getTime() - 1)), "scheduled");
  assert.equal(publicationStatus(data, boundary), "published");
  assert.equal(publicationStatus({ ...data, reviewed: false }, boundary), "unapproved");
  assert.equal(publicationStatus({ ...data, draft: true }, boundary), "draft");
  assert.doesNotMatch(content, /\{\{snippet:|EVIDENCE_URL|FIXTURE_URL/);
  const fences = [...content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
  assert.equal(fences.length, article.snippets.length, article.slug);
  for (const [index, snippet] of article.snippets.entries()) {
    assert.equal(fences[index][1], "rust", article.slug);
    const rust = await readFile(snippet.source, "utf8");
    const marker = new RegExp(
      `^[ \\t]*// article:start ${snippet.label}\\n([\\s\\S]*?)^[ \\t]*// article:end ${snippet.label}`,
      "m"
    );
    const excerpt = rust.match(marker)?.[1];
    assert.ok(excerpt, snippet.label);
    assert.equal(unindent(fences[index][2]), unindent(excerpt), `${article.slug}: ${snippet.label}`);
  }
  console.log(`Verified reviewed source, original date and Rust excerpts: ${article.slug}`);
}
