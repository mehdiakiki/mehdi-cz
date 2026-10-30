import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { editorialSeriesForPost } from "../data/editorial-series.mjs";
import { missingDuePublications, parsePublicationFrontmatter } from "./check-publication-due.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const release = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-release-2026-10-30.json", "utf8")
);
const manifest = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-drafts-2026-10-25.json", "utf8")
);
assert.equal(release.articles.length, 6);
const boundary = new Date(release.publish_at);
const before = new Date(boundary.getTime() - 1);
const posts = [];
for (const article of release.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.reviewedHash, articleReviewHash(source), article.slug);
  assert.equal(data.reviewedHash, article.reviewedHash);
  assert.equal(data.date, release.publish_at);
  assert.deepEqual(data.authors, ["default"]);
  assert.equal(data.draft, false);
  assert.equal(data.reviewed, true);
  assert.equal(publicationStatus(data, before), "scheduled");
  assert.equal(publicationStatus(data, boundary), "published");
  assert.equal(publicationStatus({ ...data, reviewed: false }, boundary), "unapproved");
  assert.equal(publicationStatus({ ...data, draft: true }, boundary), "draft");
  assert.equal(editorialSeriesForPost(article.slug)?.slug, release.series);
  const entry = manifest.articles.find((item) => item.slug === article.slug);
  assert.equal(entry?.reviewedHash, article.reviewedHash);
  const fixture = (await readFile(article.fixture, "utf8")).replace(/\s/g, "");
  const blocks = [...content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
  assert.ok(blocks.length > 0, article.slug);
  for (const block of blocks) {
    assert.equal(block[1], "rust");
    assert.ok(
      fixture.includes(block[2].replace(/\s/g, "")),
      `${article.slug}: excerpt differs from fixture`
    );
  }
  posts.push({
    ...parsePublicationFrontmatter(source),
    slug: article.slug,
    path: `/blog/${article.slug}`,
  });
  console.log(
    `Verified final review hash, Rust excerpt, sole author and release boundary: ${article.slug}`
  );
}
assert.equal(missingDuePublications(posts, "<urlset></urlset>", boundary).length, 6);
assert.deepEqual(missingDuePublications(posts, "<urlset></urlset>", before), []);
const sitemap = `<urlset>${posts.map((post) => `<url><loc>https://www.mehdi.cz${post.path}</loc></url>`).join("")}</urlset>`;
assert.deepEqual(missingDuePublications(posts, sitemap, boundary), []);
