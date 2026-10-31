import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { publicationStatus } from "../lib/publication.mjs";
import { articleReviewHash } from "../lib/content-review.mjs";
import { missingDuePublications, parsePublicationFrontmatter } from "./check-publication-due.mjs";
import { editorialSeriesForPost } from "../data/editorial-series.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/sql-rust-followups-2026-10-27.json", "utf8")
);
assert.equal(manifest.articles.length, 7);
const release = JSON.parse(
  await readFile("docs/editorial/sql-rust-followups-release-2026-10-30.json", "utf8")
);
const revisedEditions = JSON.parse(
  await readFile("docs/editorial/ai-era-sql-2026-10-31/release.json", "utf8")
);
const priorRevisions = JSON.parse(
  await readFile("docs/editorial/ai-writing-release-2026-10-31.json", "utf8")
);
const referenceRevisions = JSON.parse(
  await readFile("docs/editorial/rust-reference-release-2026-10-31.json", "utf8")
);
const boundaryRevisions = JSON.parse(
  await readFile("docs/editorial/database-boundary-updates-2026-10-31.json", "utf8")
);
const posts = [];
for (const article of manifest.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.draft, false);
  assert.equal(data.reviewed, true);
  assert.equal(data.date, release.publish_at);
  assert.equal(data.reviewedHash, articleReviewHash(source), article.slug);
  const approved = release.articles.find((item) => item.slug === article.slug);
  const boundaryRevision = boundaryRevisions.articles.find((item) => item.slug === article.slug);
  const revised = revisedEditions.articles.find(
    (item) => item.kind === "revision" && item.slug === article.slug
  );
  const priorRevision = [...referenceRevisions.articles, ...priorRevisions.articles].find(
    (item) => item.slug === article.slug && item.kind === "update"
  );
  if (boundaryRevision) {
    assert.equal(boundaryRevision.previousReviewedHash, priorRevision?.reviewedHash ?? approved?.reviewedHash, article.slug);
    assert.equal(data.reviewedHash, boundaryRevision.reviewedHash, article.slug);
    assert.equal(data.lastmod, boundaryRevision.lastmod, article.slug);
  } else if (revised) {
    assert.equal(
      revised.previousReviewedHash,
      priorRevision?.reviewedHash ?? approved?.reviewedHash,
      article.slug
    );
    assert.equal(revised.reviewedHash, data.reviewedHash, article.slug);
    assert.equal(data.lastmod, revisedEditions.applied_at);
    const manuscript = await readFile(revised.review_copy, "utf8");
    assert.equal(articleReviewHash(manuscript), articleReviewHash(source), article.slug);
  } else {
    assert.equal(
      data.reviewedHash,
      priorRevision?.reviewedHash ?? approved?.reviewedHash,
      article.slug
    );
  }
  assert.deepEqual(data.authors, ["default"]);
  const boundary = new Date(release.publish_at);
  assert.equal(publicationStatus(data, new Date(boundary.getTime() - 1)), "scheduled");
  assert.equal(publicationStatus(data, boundary), "published");
  assert.equal(publicationStatus({ ...data, draft: true }, boundary), "draft");
  assert.equal(publicationStatus({ ...data, reviewed: false }, boundary), "unapproved");
  assert.equal(editorialSeriesForPost(article.slug)?.slug, release.series);
  posts.push({
    ...parsePublicationFrontmatter(source),
    slug: article.slug,
    path: `/blog/${article.slug}`,
  });
  assert.ok(!source.includes("{{snippet:"), article.slug);
  const fences = [...content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
  const snippets = boundaryRevision?.snippets || revised?.snippets || article.snippets;
  assert.equal(fences.length, snippets.length, article.slug);
  for (const [index, snippet] of snippets.entries()) {
    assert.equal(fences[index][1], "rust");
    const fixture = await readFile(snippet.source, "utf8");
    const marker = new RegExp(
      snippet.markerStyle === "named"
        ? `^[ \\t]*// article:${snippet.label}:start\\n([\\s\\S]*?)^[ \\t]*// article:${snippet.label}:end`
        : `^[ \\t]*// article:start ${snippet.label}\\n([\\s\\S]*?)^[ \\t]*// article:end ${snippet.label}`,
      "m"
    );
    const excerpt = fixture.match(marker)?.[1];
    assert.ok(excerpt, snippet.label);
    // Markdown and rustfmt wrap long expressions differently.
    assert.equal(fences[index][2].replace(/\s/g, ""), excerpt.replace(/\s/g, ""), article.slug);
  }
  console.log(`Verified approved release, author, review hash and Rust excerpts: ${article.slug}`);
}
const now = new Date(release.publish_at);
assert.equal(missingDuePublications(posts, "<urlset></urlset>", now).length, 7);
assert.deepEqual(
  missingDuePublications(posts, "<urlset></urlset>", new Date(now.getTime() - 1)),
  []
);
const live = `<urlset>${posts.map((post) => `<url><loc>https://www.mehdi.cz${post.path}</loc></url>`).join("")}</urlset>`;
assert.deepEqual(missingDuePublications(posts, live, now), []);
