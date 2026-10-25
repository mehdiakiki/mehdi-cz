import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { markdownWordCount } from "../scripts/audit-authority-campaign.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";
import { checkLivePublications } from "../scripts/check-publication-due.mjs";
import { articleReviewHash, hasValidReviewHash } from "../lib/content-review.mjs";
import { editorialSeries } from "../data/editorial-series.mjs";
import { writingTier, writingThemeOf } from "../data/writing-tiers.mjs";

const series = JSON.parse(
  readFileSync("docs/editorial/sql-rust-proposed-series-2026-10-25.json", "utf8")
);
const approval = JSON.parse(
  readFileSync("docs/editorial/sql-rust-release-2026-10-25.json", "utf8")
);
const posts = series.articles.map((article) => {
  const source = readFileSync(`data/blog/${article.slug}.mdx`, "utf8");
  const { data, content } = matter(source);
  return {
    ...article,
    ...data,
    sourceHash: articleReviewHash(source),
    source,
    content,
    path: `/blog/${article.slug}`,
  };
});

test("the SQL series contains all thirty commissioned articles and real Rust sources", () => {
  assert.deepEqual(
    posts.map((post) => post.number),
    Array.from({ length: 30 }, (_, i) => i + 1)
  );
  assert.equal(new Set(posts.map((post) => post.slug)).size, 30);
  assert.equal(posts.filter((post) => post.kind === "profile").length, 8);
  for (const post of posts) {
    const fixture = readFileSync(post.fixture, "utf8");
    const snippetSources = (post.sourcepaths ?? [post.fixture]).map((file) => {
      assert.ok(file.startsWith("experiments/sql-rust/") && file.endsWith(".rs"), file);
      return readFileSync(file, "utf8").replace(/\s/g, "");
    });
    assert.ok(post.fixture.startsWith("experiments/sql-rust/"), post.slug);
    assert.ok(post.fixture.endsWith(".rs"), post.slug);
    assert.ok(fixture.includes("fn main"), `${post.slug}: runnable Rust entry point`);
    assert.ok(markdownWordCount(post.content) >= 800, `${post.slug}: insufficient explanation`);
    assert.ok((post.content.match(/^## /gm) ?? []).length >= 3, post.slug);
    const fences = [...post.content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
    assert.ok(fences.length > 0, `${post.slug}: missing example`);
    for (const [, info, code] of fences) {
      assert.equal(info.trim(), "rust", `${post.slug}: every code fence must use Rust`);
      // Rustfmt and the Markdown formatter can wrap the same source differently.
      assert.ok(
        snippetSources.some((source) => source.includes(code.replace(/\s/g, ""))),
        `${post.slug}: article code has drifted from ${post.fixture}`
      );
    }
    const links = [...post.content.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map((match) => match[1]);
    assert.ok(post.sources.length >= 2, `${post.slug}: missing research sources`);
    for (const source of post.sources) {
      assert.ok(
        links.some((link) => link === source || link.split("#")[0] === source),
        `${post.slug}: cite the source beside the explanation: ${source}`
      );
    }
  }
});

test("all thirty approved SQL articles are immediately public with dates before the approval day", () => {
  const now = new Date(`${approval.approved_on}T00:00:00Z`);
  assert.equal(approval.articles.length, 30);
  for (const [index, post] of posts.entries()) {
    assert.equal(post.draft, false, post.slug);
    assert.equal(post.reviewed, true, post.slug);
    assert.ok(Date.parse(post.date) < now.getTime(), post.slug);
    assert.equal(post.date, approval.publication_date, post.slug);
    assert.equal(post.date, approval.articles[index].date, post.slug);
    assert.equal(post.reviewedHash, approval.articles[index].reviewedHash, post.slug);
    assert.equal(hasValidReviewHash(post), true, post.slug);
    assert.equal(publicArticleHref(posts, post.slug, now), `/blog/${post.slug}`);
    assert.equal(writingTier(post.slug), "article", post.slug);
    assert.ok(writingThemeOf(post.slug), post.slug);
  }
  assert.deepEqual(
    editorialSeries.find((item) => item.slug === approval.series).parts,
    posts.map((post) => post.slug)
  );
});

test("the real scheduler requests all thirty absent articles and stops after they are live", async () => {
  const now = new Date(`${approval.approved_on}T00:00:00Z`);
  const check = (items, sitemap) =>
    checkLivePublications({
      posts: items,
      now,
      siteUrl: "https://www.mehdi.cz",
      fetchImpl: async () => new Response(sitemap, { status: 200 }),
    });
  const missing = await check(posts, "<urlset></urlset>");
  assert.equal(missing.checkFailed, false);
  assert.equal(missing.shouldDeploy, true);
  assert.deepEqual(
    missing.missing.map((post) => post.slug).sort(),
    posts.map((post) => post.slug).sort()
  );
  const live = await check(
    posts,
    posts.map((post) => `<loc>https://www.mehdi.cz/blog/${post.slug}</loc>`).join("")
  );
  assert.equal(live.shouldDeploy, false);
  assert.deepEqual(live.missing, []);
  for (const flags of [{ draft: true }, { reviewed: false }]) {
    const protectedPosts = posts.map((post) => ({ ...post, ...flags }));
    assert.ok(
      protectedPosts.every((post) => publicArticleHref(protectedPosts, post.slug, now) === null)
    );
    assert.equal((await check(protectedPosts, "<urlset></urlset>")).shouldDeploy, false);
  }
});
