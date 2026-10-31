import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { publicationStatus } from "../lib/publication.mjs";
import { articleReviewHash } from "../lib/content-review.mjs";
import { editorialSeriesForPost, editorialSeries } from "../data/editorial-series.mjs";
import { writingTier } from "../data/writing-tiers.mjs";
import { publicArticleHref, publishedSeriesParts } from "../lib/editorial-navigation.mjs";
import { missingDuePublications, parsePublicationFrontmatter } from "./check-publication-due.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/ai-era-sql-2026-10-31/manifest.json", "utf8")
);
const review = JSON.parse(await readFile(manifest.review_record, "utf8"));
const release = JSON.parse(await readFile(manifest.release_record, "utf8"));
assert.equal(review.independent_review_claimed, false);
assert.equal(review.articles.length, manifest.articles.length);
assert.equal(release.author, "Mehdi Akiki");
assert.equal(release.articles.length, manifest.articles.length);
const posts = [];

// Ignore Rust formatting outside literals. Preserve SQL and other string bytes.
function tokens(code) {
  return code
    .match(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|[A-Za-z_][A-Za-z_0-9]*|\d+|[^\s]/g)
    .filter((token) => !token.startsWith("//"));
}

function unindent(code) {
  const lines = code.trimEnd().replace(/^\n/, "").split("\n");
  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length)
  );
  return lines.map((line) => line.slice(indentation)).join("\n");
}

for (const article of manifest.articles) {
  const source = await readFile(article.path, "utf8");
  const edition = release.articles.find((item) => item.slug === article.slug);
  assert.ok(edition, article.slug);
  const publicSource = await readFile(edition.path, "utf8");
  const { data, content } = matter(publicSource);
  const reviewed = review.articles.find((item) => item.slug === article.slug);
  assert.ok(reviewed, `${article.slug}: missing editorial record`);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    reviewed.source_sha256,
    `${article.slug}: editorial record does not cover this exact manuscript`
  );
  assert.equal(data.title, article.title);
  assert.equal(articleReviewHash(source), articleReviewHash(publicSource), article.slug);
  assert.equal(data.draft, false, article.slug);
  assert.equal(data.reviewed, true, article.slug);
  assert.equal(data.reviewedHash, articleReviewHash(publicSource), article.slug);
  assert.equal(data.reviewedHash, edition.reviewedHash, article.slug);
  assert.deepEqual(data.authors, ["default"], article.slug);
  assert.equal(data.date, edition.date);
  assert.equal(data.lastmod, edition.lastmod);
  assert.equal(editorialSeriesForPost(article.slug)?.slug, edition.series);
  assert.equal(writingTier(article.slug), "article", article.slug);
  const at = new Date(data.date);
  assert.equal(publicationStatus(data, new Date(at.getTime() - 1)), "scheduled");
  assert.equal(publicationStatus(data, at), "published");
  assert.equal(publicationStatus({ ...data, draft: true }, at), "draft");
  assert.equal(publicationStatus({ ...data, reviewed: false }, at), "unapproved");
  if (article.kind === "revision") {
    assert.equal(edition.path, article.target);
    assert.ok(edition.previousReviewedHash, article.slug);
    assert.equal(data.lastmod, release.applied_at);
    assert.ok(new Date(data.lastmod) > at);
    assert.ok(article.path.startsWith("docs/editorial/"));
  } else {
    assert.equal(article.kind, "new");
    assert.equal(article.path, `data/blog/${article.slug}.mdx`);
  }
  const fences = [...content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
  assert.equal(fences.length, article.snippets.length, article.slug);
  for (const [index, snippet] of article.snippets.entries()) {
    assert.equal(fences[index][1], "rust", article.slug);
    const fixture = await readFile(snippet.source, "utf8");
    const start =
      snippet.markerStyle === "named"
        ? `// article:${snippet.label}:start\n`
        : `// article:start ${snippet.label}\n`;
    const end =
      snippet.markerStyle === "named"
        ? `// article:${snippet.label}:end`
        : `// article:end ${snippet.label}`;
    assert.ok(fixture.includes(start) && fixture.includes(end), snippet.label);
    const excerpt = fixture.split(start)[1].split(end)[0];
    if (snippet.markerStyle === "named") {
      assert.equal(unindent(fences[index][2]), unindent(excerpt), `${article.slug}: Rust excerpt`);
    } else {
      assert.deepEqual(tokens(fences[index][2]), tokens(excerpt), `${article.slug}: Rust excerpt`);
    }
  }
  posts.push({
    ...parsePublicationFrontmatter(publicSource),
    slug: article.slug,
    path: `/blog/${article.slug}`,
  });
  console.log(`Verified released edition, review hash and exact Rust excerpts: ${article.slug}`);
}

const additions = release.articles.filter((article) => article.kind === "new");
assert.equal(additions.length, 1);
assert.equal(release.articles.filter((article) => article.kind === "revision").length, 4);
await assert.rejects(readFile(`data/blog/${release.consolidation.unpublished_vector_slug}.mdx`), {
  code: "ENOENT",
});
const series = editorialSeries.find((item) => item.slug === additions[0].series);
const newPosts = posts.filter((post) => additions.some((article) => article.slug === post.slug));
const live = [];
for (const article of additions) {
  const before = new Date(Date.parse(article.date) - 1);
  const at = new Date(article.date);
  const xml = `<urlset>${live.map((slug) => `<url><loc>https://www.mehdi.cz/blog/${slug}</loc></url>`).join("")}</urlset>`;
  assert.deepEqual(missingDuePublications(newPosts, xml, before), []);
  assert.deepEqual(
    missingDuePublications(newPosts, xml, at).map((post) => post.slug),
    [article.slug]
  );
  assert.equal(publicArticleHref(newPosts, article.slug, before), null);
  assert.equal(publicArticleHref(newPosts, article.slug, at), `/blog/${article.slug}`);
  live.push(article.slug);
  assert.deepEqual(
    publishedSeriesParts(series, newPosts, at).map((post) => post.slug),
    live
  );
}
console.log("Verified the MCP publication boundary and the consolidated vector URL.");
