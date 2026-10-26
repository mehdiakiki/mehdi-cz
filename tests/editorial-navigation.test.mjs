import assert from "node:assert/strict";
import test from "node:test";
import { editorialSeries, editorialSeriesForPost } from "../data/editorial-series.mjs";
import { heldArticleSlugs } from "../data/publication-hold.mjs";
import {
  availableEditorialSeries,
  publicArticleHref,
  publishedSeriesParts,
} from "../lib/editorial-navigation.mjs";

const now = new Date("2026-10-24T13:00:00Z");
const first = editorialSeries[0].parts[0];
const second = editorialSeries[0].parts[1];
const post = (slug, extra = {}) => ({
  slug,
  date: now.toISOString(),
  draft: false,
  reviewed: true,
  campaign: "editorial",
  ...extra,
});

test("contextual article links open only at the publication boundary with both locks cleared", () => {
  assert.equal(publicArticleHref([post(first)], first, now), `/blog/${first}`);
  for (const extra of [
    { draft: true },
    { reviewed: false },
    { reviewed: undefined },
    { date: "2026-10-24T13:00:00.001Z" },
    { date: "invalid" },
  ])
    assert.equal(publicArticleHref([post(first, extra)], first, now), null);
  assert.equal(publicArticleHref([], "missing", now), null);
});

test("an individual hold prevents contextual links and series discovery", () => {
  heldArticleSlugs.add(first);
  try {
    assert.equal(publicArticleHref([post(first)], first, now), null);
    assert.deepEqual(availableEditorialSeries([post(first)], now), []);
  } finally {
    heldArticleSlugs.delete(first);
  }
});

test("an entirely held batch creates no public series hub", () => {
  const posts = editorialSeries.flatMap((series) =>
    series.parts.map((slug) => post(slug, { draft: true, reviewed: false }))
  );
  assert.deepEqual(availableEditorialSeries(posts, now), []);
});

test("series retain their reading order while omitting future and unapproved parts", () => {
  const series = editorialSeries[0];
  const third = series.parts[2];
  const posts = [
    post(third),
    post(second, { reviewed: false }),
    post(first),
    post(series.parts[3], { date: "2026-10-25T13:00:00Z" }),
  ];
  assert.deepEqual(
    publishedSeriesParts(series, posts, now).map((item) => item.slug),
    [first, third]
  );
  assert.deepEqual(
    availableEditorialSeries(posts, now).map((item) => item.slug),
    [series.slug]
  );
  assert.equal(editorialSeriesForPost(first)?.slug, series.slug);
  assert.equal(editorialSeriesForPost("unrelated"), undefined);
});

test("all sixty-eight editorial articles have one reader series with the expected batch sizes", () => {
  const slugs = editorialSeries.flatMap((series) => series.parts);
  assert.equal(slugs.length, 68);
  assert.equal(new Set(slugs).size, 68);
  assert.ok(
    editorialSeries
      .filter((series) => !["sql-databases-from-rust", "rust-backend-in-practice"].includes(series.slug))
      .every((series) => series.parts.length === 10)
  );
  assert.equal(editorialSeries.find((series) => series.slug === "rust-backend-in-practice").parts.length, 8);
  assert.equal(
    editorialSeries.find((series) => series.slug === "sql-databases-from-rust").parts.length,
    30
  );
});
