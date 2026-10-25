import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { editorialSeries as allEditorialSeries } from "../data/editorial-series.mjs";
import { heldArticleSlugs } from "../data/publication-hold.mjs";
import { hasValidReviewHash } from "../lib/content-review.mjs";
import {
  availableEditorialSeries,
  publicArticleHref,
  publishedSeriesParts,
} from "../lib/editorial-navigation.mjs";
import {
  checkLivePublications,
  parsePublicationFrontmatter,
} from "../scripts/check-publication-due.mjs";

const approval = JSON.parse(
  await readFile(new URL("../docs/editorial/release-2026-10-25.json", import.meta.url), "utf8")
);
const approvedSlugs = new Set(approval.articles.map((article) => article.slug));
const editorialSeries = allEditorialSeries.filter((series) =>
  series.parts.every((slug) => approvedSlugs.has(slug))
);
const posts = await Promise.all(
  approval.articles.map(async ({ slug }) => {
    const source = await readFile(new URL(`../data/blog/${slug}.mdx`, import.meta.url), "utf8");
    return { ...parsePublicationFrontmatter(source), slug, path: `/blog/${slug}` };
  })
);
const day = 24 * 60 * 60 * 1000;
const start = Date.parse(`${approval.approved_on}T13:00:00Z`);
const sitemap = (items) =>
  items.map((post) => `<loc>https://www.mehdi.cz${post.path}</loc>`).join("");

test("the approved thirty sources have exact review hashes and one UTC slot per day", () => {
  assert.equal(posts.length, 30);
  assert.deepEqual(
    posts.map((post) => post.slug),
    editorialSeries.flatMap((series) => series.parts)
  );
  assert.equal(approval.first_publication, new Date(start).toISOString().replace(".000Z", "Z"));
  assert.equal(Date.parse(approval.last_publication), start + 29 * day);
  for (const [index, post] of posts.entries()) {
    assert.equal(post.draft, false, post.slug);
    assert.equal(post.reviewed, true, post.slug);
    assert.equal(hasValidReviewHash(post), true, post.slug);
    assert.equal(post.reviewedHash, approval.articles[index].reviewedHash, post.slug);
    assert.equal(post.date, approval.articles[index].date, post.slug);
    assert.equal(Date.parse(post.date), start + index * day, post.slug);
    assert.equal(heldArticleSlugs.has(post.slug), false, post.slug);
  }
});

test("each daily boundary requests only its newly due article from the real checker", async () => {
  for (const [index, post] of posts.entries()) {
    const live = sitemap(posts.slice(0, index));
    const fetchImpl = async () => new Response(live, { status: 200 });
    const before = await checkLivePublications({
      posts,
      siteUrl: "https://www.mehdi.cz",
      now: new Date(Date.parse(post.date) - 1),
      fetchImpl,
    });
    assert.equal(before.shouldDeploy, false, post.slug);
    assert.equal(before.checkFailed, false, post.slug);
    const due = await checkLivePublications({
      posts,
      siteUrl: "https://www.mehdi.cz",
      now: new Date(post.date),
      fetchImpl,
    });
    assert.equal(due.shouldDeploy, true, post.slug);
    assert.deepEqual(
      due.missing.map((item) => item.slug),
      [post.slug]
    );
  }
  const complete = await checkLivePublications({
    posts,
    siteUrl: "https://www.mehdi.cz",
    now: new Date(Date.parse(approval.last_publication) + day),
    fetchImpl: async () => new Response(sitemap(posts), { status: 200 }),
  });
  assert.equal(complete.shouldDeploy, false);
});

test("series hubs and contextual links advance with the approved daily release", () => {
  assert.deepEqual(availableEditorialSeries(posts, new Date(start - 1)), []);
  for (const [seriesIndex, series] of editorialSeries.entries()) {
    const now = new Date(start + seriesIndex * 10 * day);
    assert.deepEqual(
      availableEditorialSeries(posts, now).map((item) => item.slug),
      editorialSeries.slice(0, seriesIndex + 1).map((item) => item.slug)
    );
    assert.deepEqual(
      publishedSeriesParts(series, posts, now).map((item) => item.slug),
      [series.parts[0]]
    );
    assert.equal(publicArticleHref(posts, series.parts[0], now), `/blog/${series.parts[0]}`);
    assert.equal(publicArticleHref(posts, series.parts[1], now), null);
  }
});
