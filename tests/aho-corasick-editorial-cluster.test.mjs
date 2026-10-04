import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import matter from "gray-matter";

import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { markdownWordCount } from "../scripts/audit-authority-campaign.mjs";

const repositoryRoot = path.resolve(".");
const blogDirectory = path.join(repositoryRoot, "data", "blog");
const pillarSlug = "zero-copy-does-not-mean-zero-memory-access-aho-corasick-rust";
const authoredAt = new Date("2026-09-05T12:00:00+01:00");

const schedule = [
  ["search-across-chunk-boundaries-rust-without-missing-matches", "2026-09-07T08:40:00+01:00"],
  ["why-aho-corasick-streaming-still-needs-buffer", "2026-09-10T16:20:00+01:00"],
  ["aho-corasick-match-kinds-standard-leftmost-rust", "2026-09-13T11:10:00+01:00"],
  ["aho-corasick-dfa-or-nfa-rust", "2026-09-17T15:40:00+01:00"],
  ["why-more-patterns-can-slow-aho-corasick", "2026-09-21T09:25:00+01:00"],
  ["when-aho-corasick-prefilters-help-or-hurt", "2026-09-25T18:10:00+01:00"],
  ["pattern-shape-simd-search-performance-rust", "2026-09-30T12:35:00+01:00"],
  ["why-one-lookup-per-byte-can-be-latency-bound", "2026-10-05T08:50:00+01:00"],
  ["benchmark-streaming-scanner-rust", "2026-10-10T14:15:00+01:00"],
  ["when-match-reporting-costs-more-than-search", "2026-10-15T10:40:00+01:00"],
  ["rust-bytes-are-not-text-utf8-scanners", "2026-10-20T17:25:00+01:00"],
  ["rust-bufread-slices-memory-mapping-copying", "2026-10-24T09:10:00+01:00"],
  ["reuse-compiled-aho-corasick-searchers-rust", "2026-10-28T13:50:00+01:00"],
  ["test-streaming-algorithms-every-chunk-boundary", "2026-10-31T16:05:00+01:00"],
];

function readArticle(slug) {
  const source = readFileSync(path.join(blogDirectory, `${slug}.mdx`), "utf8");
  const parsed = matter(source);
  return { source, ...parsed };
}

test("the Aho-Corasick editorial cluster has 14 explicit irregular publication slots", () => {
  assert.equal(schedule.length, 14);
  assert.equal(new Set(schedule.map(([, date]) => date)).size, schedule.length);
  assert.equal(schedule.filter(([, date]) => date.startsWith("2026-09")).length, 7);
  assert.equal(schedule.filter(([, date]) => date.startsWith("2026-10")).length, 7);

  const gaps = schedule.slice(1).map(([, date], index) => {
    const previous = new Date(schedule[index][1]);
    return (new Date(date).getTime() - previous.getTime()) / 86_400_000;
  });
  assert.ok(new Set(gaps.map((gap) => Math.round(gap * 10))).size >= 5);
});

test("every supporting article is substantial, review-bound, and linked to the pillar", () => {
  for (const [slug, date] of schedule) {
    const article = readArticle(slug);
    const words = markdownWordCount(article.content);

    assert.equal(article.data.date, date, slug);
    assert.equal(article.data.draft, false, slug);
    assert.equal(article.data.reviewed, true, slug);
    assert.equal(article.data.cluster, "rust-under-the-hood", slug);
    assert.equal(article.data.campaign, "editorial", slug);
    assert.ok(article.data.tags.includes("aho-corasick"), slug);
    assert.equal(article.data.reviewedHash, articleReviewHash(article.source), slug);
    assert.ok(words >= 700 && words <= 1_400, `${slug} contains ${words} body words`);
    assert.match(article.content, new RegExp(`/blog/${pillarSlug}`), slug);
    assert.equal(publicationStatus(article.data, authoredAt), "scheduled", slug);
    assert.equal(publicationStatus(article.data, new Date(date)), "published", slug);
  }
});

test("scheduled articles never link forward to an unpublished article", () => {
  const scheduledFor = new Map(schedule);

  for (const [slug, date] of schedule) {
    const article = readArticle(slug);
    const internalLinks = [...article.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)/g)].map(
      (match) => match[1]
    );

    for (const target of internalLinks) {
      const targetDate = scheduledFor.get(target);
      if (!targetDate) continue;
      assert.ok(new Date(targetDate) <= new Date(date), `${slug} links early to ${target}`);
    }
  }
});

test("the live pillar uses publication-aware cluster navigation", () => {
  const pillar = readArticle(pillarSlug);

  assert.match(pillar.content, /\/blog\/tags\/aho-corasick\/page\/1/);
  for (const [slug] of schedule) {
    assert.ok(!pillar.content.includes(`/blog/${slug}`), slug);
  }
  assert.equal(pillar.data.reviewedHash, articleReviewHash(pillar.source));
});
