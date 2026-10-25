import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { markdownWordCount } from "../scripts/audit-authority-campaign.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";
import { checkLivePublications } from "../scripts/check-publication-due.mjs";

const series = JSON.parse(
  readFileSync("docs/editorial/sql-rust-proposed-series-2026-10-25.json", "utf8")
);
const posts = series.articles.map((article) => {
  const source = readFileSync(`data/blog/${article.slug}.mdx`, "utf8");
  const { data, content } = matter(source);
  return { ...data, ...article, source, content, path: `/blog/${article.slug}` };
});

test("the SQL series contains all thirty commissioned articles and real Rust sources", () => {
  assert.deepEqual(posts.map((post) => post.number), Array.from({ length: 30 }, (_, i) => i + 1));
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

test("draft SQL articles never become public links or trigger the scheduler", async () => {
  for (const now of [new Date("2026-10-25T13:00:00Z"), new Date("2036-01-01T00:00:00Z")]) {
    for (const post of posts) {
      assert.equal(post.draft, true, post.slug);
      assert.equal(post.reviewed, false, post.slug);
      assert.equal(publicArticleHref(posts, post.slug, now), null, post.slug);
    }
    const result = await checkLivePublications({
      posts,
      now,
      siteUrl: "https://www.mehdi.cz",
      fetchImpl: async () => {
        return new Response("<urlset></urlset>", { status: 200 });
      },
    });
    assert.equal(result.shouldDeploy, false);
    assert.deepEqual(result.missing, []);
  }
});
