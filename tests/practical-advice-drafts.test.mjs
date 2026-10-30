import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { publicationStatus } from "../lib/publication.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";
import { checkLivePublications } from "../scripts/check-publication-due.mjs";

const manifest = JSON.parse(
  readFileSync("docs/editorial/practical-advice-50-drafts-2026-10-25.json", "utf8")
);
const posts = manifest.articles.map((article) => {
  const source = readFileSync(article.path, "utf8");
  const { data, content } = matter(source);
  return { ...article, ...data, content, path: `/blog/${article.slug}` };
});

test("every approved practical topic has a distinct manuscript and its deeper destination", () => {
  assert.equal(posts.length, 50);
  assert.equal(new Set(posts.map((post) => post.slug)).size, 50);
  assert.equal(new Set(posts.map((post) => post.title)).size, 50);
  for (const post of posts) {
    assert.ok(post.content.includes(`](/blog/${post.primary_parent_slug})`), post.slug);
    assert.ok(post.content.includes("\n## "), post.slug);
    assert.ok(post.content.length > 2000, post.slug);
    for (const match of post.content.matchAll(/\]\(\/blog\/([^)]+)\)/g)) {
      const source = readFileSync(`data/blog/${match[1]}.mdx`, "utf8");
      const parent = { ...matter(source).data, slug: match[1] };
      assert.equal(publicationStatus(parent), "published", `${post.slug}: ${match[1]}`);
    }
  }
});

test("time alone cannot release any of the fifty unapproved drafts", async () => {
  const future = new Date("2030-01-01T00:00:00Z");
  const held = posts.filter((post) => post.reviewed !== true);
  assert.equal(held.length, 44);
  for (const post of held) {
    assert.equal(post.draft, true, post.slug);
    assert.equal(post.reviewed, false, post.slug);
    assert.equal(publicArticleHref(posts, post.slug, future), null);
    assert.equal(publicationStatus({ ...post, draft: false }, future), "unapproved");
    assert.equal(publicationStatus({ ...post, reviewed: true }, future), "draft");
  }
  const result = await checkLivePublications({
    posts: held,
    siteUrl: "https://www.mehdi.cz",
    now: future,
    fetchImpl: async () => new Response("<urlset></urlset>", { status: 200 }),
  });
  assert.equal(result.checkFailed, false);
  assert.equal(result.shouldDeploy, false);
  assert.deepEqual(result.missing, []);
});

test("the synthetic evaluation example really improves the total while losing write cases", () => {
  const post = posts.find((item) => item.number === 50);
  const rows = [
    ...post.content.matchAll(
      /\|\s*(ordinary lookup|sensitive write|total)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/g
    ),
  ];
  assert.equal(rows.length, 3);
  const values = rows.map((row) => row.slice(2).map(Number));
  assert.deepEqual(
    values[2],
    values[0].map((n, index) => n + values[1][index])
  );
  assert.ok(values[2][2] > values[2][1]);
  assert.ok(values[1][2] < values[1][1]);
  assert.ok(post.content.includes("synthetic dataset"));
});
