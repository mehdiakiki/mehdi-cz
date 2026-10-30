import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { editorialSeriesForPost } from "../data/editorial-series.mjs";
import { writingTier } from "../data/writing-tiers.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const release = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-completed-release-2026-10-30.json", "utf8")
);
const manifest = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-drafts-2026-10-25.json", "utf8")
);
assert.equal(release.articles.length, 42);
assert.equal(release.consolidations.length, 2);
const at = new Date(release.publish_at);
const compiledCases = new Map([
  [9, "scripts/prepare-practical-advice-integration.mjs"],
  [14, "scripts/verify-practical-advice-snippets.mjs"],
  [16, "scripts/verify-practical-advice-snippets.mjs"],
  [17, "scripts/verify-practical-advice-snippets.mjs"],
  [18, "scripts/prepare-practical-advice-integration.mjs"],
  [20, "scripts/verify-practical-advice-snippets.mjs"],
  [39, "scripts/prepare-practical-advice-integration.mjs"],
]);
const compact = (code) => code.replace(/\s/g, "");
for (const article of release.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.reviewedHash, articleReviewHash(source), article.slug);
  assert.equal(data.reviewedHash, article.reviewedHash, article.slug);
  assert.equal(
    data.reviewedHash,
    manifest.articles.find((item) => item.slug === article.slug)?.reviewedHash
  );
  assert.deepEqual(data.authors, ["default"]);
  assert.equal(data.draft, false);
  assert.equal(data.reviewed, true);
  assert.equal(data.date, release.publish_at);
  assert.equal(publicationStatus(data, new Date(at.getTime() - 1)), "scheduled");
  assert.equal(publicationStatus(data, at), "published");
  assert.equal(publicationStatus({ ...data, draft: true }, at), "draft");
  assert.equal(publicationStatus({ ...data, reviewed: false }, at), "unapproved");
  assert.equal(editorialSeriesForPost(article.slug)?.slug, article.series);
  assert.equal(writingTier(article.slug), "article", article.slug);
  const blocks = [...content.matchAll(/^```rust\n([\s\S]*?)^```/gm)];
  assert.equal(blocks.length, article.snippets.length, article.slug);
  for (const [index, snippet] of article.snippets.entries()) {
    if (snippet.kind === "fixture-excerpt") {
      assert.ok(
        compact(await readFile(snippet.source, "utf8")).includes(compact(blocks[index][1])),
        `${article.slug}: exact excerpt ${index}`
      );
    } else {
      assert.equal(snippet.kind, "article-compiled");
      assert.equal(snippet.source, compiledCases.get(article.number));
      assert.equal(index, article.number === 9 ? 1 : 0);
      const verifier = await readFile(snippet.source, "utf8");
      assert.ok(
        verifier.includes(`number: ${article.number}`) ||
          verifier.includes(`snippet(${article.number})`) ||
          verifier.includes(`snippet(${article.number},`)
      );
    }
  }
}
for (const alias of release.consolidations) {
  const { data } = matter(await readFile(alias.path, "utf8"));
  assert.equal(data.draft, true);
  assert.equal(data.reviewed, false);
  assert.equal(publicationStatus(data, new Date("2030-01-01")), "draft");
  const target = matter(await readFile(`data/blog/${alias.destination}.mdx`, "utf8")).data;
  assert.equal(publicationStatus(target, at), "published");
}
if (process.argv[2] === "rendered") {
  const routes = JSON.parse(await readFile(".next/routes-manifest.json", "utf8"));
  const surfaces = await Promise.all(
    ["public/search.json", "public/feed.xml", ".next/server/app/sitemap.xml.body"].map((file) =>
      readFile(file, "utf8")
    )
  );
  for (const alias of release.consolidations) {
    const route = routes.redirects.find((route) => route.source === `/blog/${alias.slug}`);
    assert.equal(route?.destination, `/blog/${alias.destination}`);
    assert.equal(route?.statusCode, 308);
    for (const surface of surfaces)
      assert.ok(!surface.includes(alias.slug), `consolidated source leaked: ${alias.slug}`);
    await assert.rejects(readFile(`.next/server/app/blog/${alias.slug}.html`), { code: "ENOENT" });
  }
}
console.log(
  "Verified 42 final reviewed sources, exact compiled excerpts, sole author, release gates and reader series; two consolidated bodies remain private."
);
