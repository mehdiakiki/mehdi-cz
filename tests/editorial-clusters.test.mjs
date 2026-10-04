import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { markdownWordCount } from "../scripts/audit-authority-campaign.mjs";

const repositoryRoot = path.resolve(".");
const blogDirectory = path.join(repositoryRoot, "data", "blog");

// Editorial pillar-and-spoke clusters started in September 2026. Each pillar
// goes live first; spokes follow on irregular editorial slots that never use
// the 09:00 campaign baseline. Spokes link the pillar; nobody links forward.
export const editorialClusters = [
  {
    name: "async Rust",
    cluster: "rust-under-the-hood",
    tag: "async rust",
    tagPath: "/blog/tags/async-rust/page/1",
    pillar: ["how-async-rust-works-under-the-hood", "2026-09-09T06:10:00+01:00"],
    spokes: [
      ["async-fn-in-dyn-trait-what-the-box-costs-measured", "2026-09-09T07:00:00+01:00"],
      ["async-cleanup-in-rust-when-drop-cannot-await", "2026-09-09T07:10:00+01:00"],
    ],
  },
  {
    name: "Rust build times",
    cluster: "rust-under-the-hood",
    tag: "compile times",
    tagPath: "/blog/tags/compile-times/page/1",
    pillar: ["why-is-my-rust-build-slow-a-diagnostic-tree", "2026-09-09T06:40:00+01:00"],
    spokes: [
      ["why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons", "2026-09-09T07:20:00+01:00"],
      ["the-unit-of-rebuild-when-you-split-a-rust-workspace", "2026-09-09T07:30:00+01:00"],
    ],
  },
  {
    name: "AI reliability",
    cluster: "reliable-ai-systems",
    tag: "llm evaluation",
    tagPath: "/blog/tags/llm-evaluation/page/1",
    pillar: ["what-evidence-an-ai-feature-needs-before-you-ship-it", "2026-09-09T06:30:00+01:00"],
    spokes: [
      ["eval-scores-move-between-runs-how-to-compare-two-versions-honestly", "2026-09-09T07:40:00+01:00"],
      ["a-record-and-replay-harness-for-agent-tests", "2026-09-09T07:50:00+01:00"],
    ],
  },
  {
    name: "types under the hood",
    cluster: "rust-under-the-hood",
    tag: "types under the hood",
    tagPath: "/blog/tags/types-under-the-hood/page/1",
    pillar: ["what-is-a-type-a-set-of-values-a-promise-about-operations-or-both", "2026-09-09T06:20:00+01:00"],
    spokes: [
      ["does-a-type-exist-at-runtime-following-one-value-from-source-to-register", "2026-09-09T08:10:00+01:00", { maxWords: 2400 }],
      ["a-type-is-a-set-why-human-has-two-members-and-option-human-has-three", "2026-09-09T08:40:00+01:00", { maxWords: 1800 }],
      ["shape-without-behavior-two-structs-with-the-same-fields", "2026-09-09T09:20:00+01:00", { maxWords: 1800 }],
      ["behavior-without-shape-traits-interfaces-and-types-that-own-no-bytes", "2026-09-10T07:30:00+01:00", { maxWords: 1800 }],
      ["where-a-type-becomes-a-layout-fields-padding-and-reordering", "2026-09-11T06:10:00+01:00", { maxWords: 1800 }],
      ["two-ways-to-make-a-type-disappear-erasure-and-monomorphization", "2026-09-11T06:40:00+01:00", { maxWords: 1800 }],
      ["the-processor-has-no-types-what-add-does-to-bits-it-does-not-understand", "2026-09-11T07:10:00+01:00", { maxWords: 1800 }],
      ["runtime-type-tags-what-dynamic-languages-keep-that-static-ones-throw-away", "2026-09-11T07:40:00+01:00", { maxWords: 1800 }],
      ["types-as-proofs-what-the-checker-knows-that-the-binary-forgets", "2026-09-11T08:10:00+01:00", { maxWords: 1800 }],
    ],
  },
];

function articlePath(slug) {
  return path.join(blogDirectory, `${slug}.mdx`);
}

function readArticle(slug) {
  const source = readFileSync(articlePath(slug), "utf8");
  return { source, ...matter(source) };
}

function assertReleaseLocksAreConsistent(article, slug) {
  assert.equal(typeof article.data.draft, "boolean", slug);
  assert.equal(typeof article.data.reviewed, "boolean", slug);
  if (article.data.reviewed === true) {
    assert.equal(article.data.draft, false, slug);
    assert.equal(article.data.reviewedHash, articleReviewHash(article.source), slug);
  } else {
    assert.equal(article.data.draft, true, `${slug} must stay a draft until reviewed`);
  }
}

function assertCommonRules(article, slug, cluster) {
  assert.equal(article.data.cluster, cluster.cluster, slug);
  assert.equal(article.data.campaign, "editorial", slug);
  assert.ok(article.data.tags.includes(cluster.tag), `${slug} lacks tag ${cluster.tag}`);
  assert.ok(!article.source.includes("—"), `${slug} contains an em dash`);
  assert.ok(typeof article.data.summary === "string" && article.data.summary.length > 80, slug);
  assertReleaseLocksAreConsistent(article, slug);
}

for (const cluster of editorialClusters) {
  const [pillarSlug, pillarDate] = cluster.pillar;
  // A cluster whose files are not written yet is skipped, not failed, so the
  // build keeps working while a cluster is in progress.
  const written = [pillarSlug, ...cluster.spokes.map(([slug]) => slug)].filter((slug) =>
    existsSync(articlePath(slug))
  );
  if (written.length === 0) continue;

  test(`${cluster.name}: the pillar carries the editorial metadata and navigation`, () => {
    const pillar = readArticle(pillarSlug);
    assert.equal(pillar.data.date, pillarDate);
    assert.notEqual(pillarDate.slice(11, 16), "09:00");
    assertCommonRules(pillar, pillarSlug, cluster);
    assert.ok(pillar.content.includes(cluster.tagPath), `${pillarSlug} lacks ${cluster.tagPath}`);
    assert.ok(pillar.content.includes(`/blog/topics/${cluster.cluster}`), pillarSlug);
    const words = markdownWordCount(pillar.content);
    assert.ok(words >= 1800 && words <= 2400, `${pillarSlug} contains ${words} body words`);
  });

  test(`${cluster.name}: every spoke is substantial, dated after the pillar, and linked to it`, () => {
    assert.equal(new Set(cluster.spokes.map(([, date]) => date)).size, cluster.spokes.length);
    for (const [slug, date, options = {}] of cluster.spokes) {
      if (!existsSync(articlePath(slug))) continue;
      const article = readArticle(slug);
      assert.equal(article.data.date, date, slug);
      assert.ok(new Date(date) > new Date(pillarDate), `${slug} is dated before the pillar`);
      assert.notEqual(date.slice(11, 16), "09:00", `${slug} collides with the campaign baseline`);
      assertCommonRules(article, slug, cluster);
      const words = markdownWordCount(article.content);
      const maxWords = options.maxWords ?? 1400;
      assert.ok(words >= 700 && words <= maxWords, `${slug} contains ${words} body words`);
      assert.match(article.content, new RegExp(`/blog/${pillarSlug}`), slug);
    }
  });

  test(`${cluster.name}: articles never link forward to an unpublished article`, () => {
    const scheduledFor = new Map([[pillarSlug, pillarDate], ...cluster.spokes]);
    for (const [slug, date] of scheduledFor) {
      if (!existsSync(articlePath(slug))) continue;
      const article = readArticle(slug);
      const internalLinks = [...article.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)/g)].map(
        (match) => match[1]
      );
      for (const target of internalLinks) {
        if (target === "tags" || target === "topics") continue; // site routes, not articles
        assert.ok(existsSync(articlePath(target)), `${slug} links to missing ${target}`);
        const targetDate = scheduledFor.get(target) ?? readArticle(target).data.date;
        assert.ok(
          new Date(targetDate) <= new Date(date),
          `${slug} links early to ${target} (${targetDate})`
        );
      }
    }
  });
}

test("editorial cluster timestamps are unique across clusters", () => {
  const dates = editorialClusters.flatMap((cluster) => [
    cluster.pillar[1],
    ...cluster.spokes.map(([, date]) => date),
  ]);
  assert.equal(new Set(dates).size, dates.length);
});
