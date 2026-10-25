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
// the 09:00 campaign baseline. Spokes link the pillar; nobody links to an
// article before it is live.
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
  {
    name: "from source to process",
    cluster: "rust-under-the-hood",
    tag: "from source to process",
    tagPath: "/blog/tags/from-source-to-process/page/1",
    pillar: ["what-happens-when-you-run-a-program-from-execve-to-main", "2026-08-25T11:55:00+01:00"],
    spokes: [
      ["what-is-inside-an-executable-file-elf-headers-segments-and-sections", "2026-08-31T08:25:00+01:00", { maxWords: 1800 }],
      ["where-variables-live-in-a-binary-text-rodata-data-and-bss", "2026-09-03T19:45:00+01:00", { maxWords: 1800 }],
      ["why-undefined-reference-is-a-linker-error-not-a-compiler-error", "2026-09-07T13:05:00+01:00", { maxWords: 1800 }],
      ["relocations-the-holes-the-compiler-leaves-for-the-linker", "2026-09-10T16:30:00+01:00", { maxWords: 1800 }],
      ["static-or-dynamic-linking-what-changes-in-the-binary-and-at-startup", "2026-09-12T13:40:00+01:00", { maxWords: 1800 }],
      ["how-the-dynamic-loader-finds-a-shared-library", "2026-09-17T21:15:00+01:00", { maxWords: 1800 }],
      ["how-a-call-to-printf-finds-printf-the-plt-and-the-got", "2026-09-22T18:25:00+01:00", { maxWords: 1800 }],
      ["how-ld-preload-replaces-a-function-without-recompiling", "2026-09-23T12:10:00+01:00", { maxWords: 1800 }],
      ["the-code-that-runs-before-main-start-constructors-and-init-array", "2026-09-26T14:05:00+01:00", { maxWords: 1800 }],
      ["what-is-on-the-stack-when-a-process-starts-argv-envp-and-auxv", "2026-09-30T12:30:00+01:00", { maxWords: 1800 }],
      ["reading-proc-self-maps-line-by-line", "2026-10-01T14:20:00+01:00", { maxWords: 1800 }],
      ["why-the-first-touch-of-memory-is-slow-demand-paging-measured", "2026-10-05T10:35:00+01:00", { maxWords: 1800 }],
      ["what-fork-really-copies-copy-on-write-measured", "2026-10-07T07:40:00+01:00", { maxWords: 1800 }],
      ["when-malloc-asks-the-kernel-for-memory-brk-and-mmap", "2026-10-09T22:30:00+01:00", { maxWords: 1800 }],
      ["why-freeing-memory-does-not-shrink-your-process", "2026-10-15T09:05:00+01:00", { maxWords: 1800 }],
      ["what-a-system-call-costs-and-why-some-calls-skip-the-kernel", "2026-10-16T22:05:00+01:00", { maxWords: 1800 }],
      ["how-a-stack-overflow-is-detected-guard-pages-and-signals", "2026-10-17T14:10:00+01:00", { maxWords: 1800 }],
      ["how-each-thread-gets-its-own-copy-of-a-variable-thread-local-storage", "2026-10-20T14:40:00+01:00", { maxWords: 1800 }],
      ["what-happens-when-a-process-exits", "2026-10-22T18:45:00+01:00", { maxWords: 1800 }],
    ],
  },
  {
    name: "what survives a crash",
    cluster: "reliable-data-integrations",
    tag: "what survives a crash",
    tagPath: "/blog/tags/what-survives-a-crash/page/1",
    pillar: ["your-data-is-not-on-disk-when-write-returns", "2026-08-26T10:10:00+01:00"],
    spokes: [
      ["what-fsync-costs-on-a-laptop-ssd", "2026-09-01T15:55:00+01:00", { maxWords: 1800 }],
      ["how-to-save-a-file-without-losing-it-write-fsync-rename", "2026-09-02T08:40:00+01:00", { maxWords: 1800 }],
      ["why-the-directory-needs-fsync-too", "2026-09-06T17:05:00+01:00", { maxWords: 1800 }],
      ["the-zero-length-file-problem-and-what-ext4-does-about-it", "2026-09-11T15:35:00+01:00", { maxWords: 1800 }],
      ["what-a-crash-in-the-middle-of-a-write-leaves-behind", "2026-09-13T20:50:00+01:00", { maxWords: 1800 }],
      ["building-a-tiny-crash-simulator-from-strace-output", "2026-09-16T18:45:00+01:00", { maxWords: 1800 }],
      ["an-append-only-log-that-survives-a-torn-last-record", "2026-09-20T09:25:00+01:00", { maxWords: 1800 }],
      ["write-ahead-logging-from-scratch", "2026-09-24T19:55:00+01:00", { maxWords: 1800 }],
      ["checkpointing-a-log-without-losing-the-tail", "2026-09-25T08:30:00+01:00", { maxWords: 1800 }],
      ["recovery-code-must-survive-a-crash-too", "2026-09-28T21:45:00+01:00", { maxWords: 1800 }],
      ["when-fsync-fails-what-postgresql-learned-in-2018", "2026-10-02T16:10:00+01:00", { maxWords: 1800 }],
      ["how-sqlite-commits-a-transaction-followed-with-strace", "2026-10-06T17:45:00+01:00", { maxWords: 1800 }],
      ["sqlite-wal-mode-fewer-fsyncs-a-different-promise", "2026-10-07T16:10:00+01:00", { maxWords: 1800 }],
      ["durability-settings-that-trade-your-data-for-speed", "2026-10-11T19:45:00+01:00", { maxWords: 1800 }],
      ["group-commit-how-databases-make-fsync-cheaper", "2026-10-14T15:15:00+01:00", { maxWords: 1800 }],
      ["writing-through-mmap-who-decides-when-data-reaches-the-disk", "2026-10-17T06:35:00+01:00", { maxWords: 1800 }],
      ["checksums-catching-corruption-the-disk-did-not-report", "2026-10-18T12:35:00+01:00", { maxWords: 1800 }],
      ["updating-several-files-at-once-with-one-rename", "2026-10-19T14:55:00+01:00", { maxWords: 1800 }],
      ["testing-crash-recovery-kill-9-fault-injection-and-simulation", "2026-10-23T20:35:00+01:00", { maxWords: 1800 }],
    ],
  },
  {
    name: "when the benchmark lies",
    tag: "when the benchmark lies",
    tagPath: "/blog/tags/when-the-benchmark-lies/page/1",
    pillar: ["the-benchmark-that-measured-nothing", "2026-08-27T20:15:00+01:00"],
    spokes: [
      ["a-debug-build-measures-a-different-program", "2026-08-31T21:35:00+01:00", { maxWords: 1800 }],
      ["when-the-compiler-computes-the-answer-before-the-benchmark-runs", "2026-09-05T18:25:00+01:00", { maxWords: 1800 }],
      ["why-the-first-run-is-slower", "2026-09-06T22:05:00+01:00", { maxWords: 1800 }],
      ["jit-warmup-why-a-function-gets-faster-after-thousands-of-calls", "2026-09-09T09:25:00+01:00", { maxWords: 1800 }],
      ["my-laptop-changed-its-cpu-speed-during-the-benchmark", "2026-09-16T07:15:00+01:00", { maxWords: 1800 }],
      ["the-benchmark-ran-on-an-efficiency-core", "2026-09-18T06:55:00+01:00", { maxWords: 1800 }],
      ["the-average-hides-the-slow-requests", "2026-09-19T18:05:00+01:00", { maxWords: 1800 }],
      ["coordinated-omission-how-a-load-test-hides-its-worst-latency", "2026-09-23T15:55:00+01:00", { maxWords: 1800 }],
      ["which-clock-to-use-when-you-measure-time", "2026-09-27T12:45:00+01:00", { maxWords: 1800 }],
      ["measuring-something-faster-than-the-clock", "2026-09-29T13:50:00+01:00", { maxWords: 1800 }],
      ["how-many-benchmark-runs-are-enough", "2026-10-03T13:55:00+01:00", { maxWords: 1800 }],
      ["compare-two-versions-by-interleaving-the-runs", "2026-10-06T06:40:00+01:00", { maxWords: 1800 }],
      ["can-environment-variables-change-how-fast-your-code-runs", "2026-10-08T21:50:00+01:00", { maxWords: 1800 }],
      ["does-code-alignment-change-the-speed-of-the-same-code", "2026-10-10T18:45:00+01:00", { maxWords: 1800 }],
      ["when-the-working-set-no-longer-fits-in-cache", "2026-10-13T09:05:00+01:00", { maxWords: 1800 }],
      ["why-sorted-data-can-make-the-same-loop-faster", "2026-10-16T19:00:00+01:00", { maxWords: 1800 }],
      ["the-benchmark-measured-the-allocator", "2026-10-18T22:00:00+01:00", { maxWords: 1800 }],
      ["the-microbenchmark-won-and-the-program-got-slower", "2026-10-20T18:55:00+01:00", { maxWords: 1800 }],
      ["a-benchmark-result-someone-else-can-check", "2026-10-21T16:55:00+01:00", { maxWords: 1800 }],
    ],
  },
  {
    name: "following a tcp connection",
    cluster: "reliable-data-integrations",
    tag: "following a tcp connection",
    tagPath: "/blog/tags/following-a-tcp-connection/page/1",
    pillar: ["what-happens-when-your-program-calls-connect", "2026-07-01T18:55:00+01:00"],
    spokes: [
      ["the-accept-queue-what-happens-when-a-server-accepts-too-slowly", "2026-07-05T11:15:00+01:00", { maxWords: 1800 }],
      ["why-a-small-write-can-wait-40-milliseconds-nagle-and-delayed-ack", "2026-07-10T16:30:00+01:00", { maxWords: 1800 }],
      ["why-recv-returns-less-than-you-asked-tcp-is-a-byte-stream", "2026-07-12T17:25:00+01:00", { maxWords: 1800 }],
      ["what-a-full-socket-buffer-does-to-the-sender", "2026-07-15T12:05:00+01:00", { maxWords: 1800 }],
      ["what-close-really-sends-fin-rst-and-unread-data", "2026-07-19T15:10:00+01:00", { maxWords: 1800 }],
      ["time-wait-why-a-closed-connection-stays-around", "2026-08-03T22:15:00+01:00", { maxWords: 1800 }],
      ["how-a-name-becomes-an-address-what-getaddrinfo-really-does", "2026-08-08T07:25:00+01:00", { maxWords: 1800 }],
      ["what-a-tls-handshake-costs", "2026-08-11T10:25:00+01:00", { maxWords: 1800 }],
      ["what-a-connection-pool-saves-and-the-stale-connection-it-gives-back", "2026-08-24T09:40:00+01:00", { maxWords: 1800 }],
    ],
  },
  {
    name: "inside a database index",
    tag: "inside a database index",
    tagPath: "/blog/tags/inside-a-database-index/page/1",
    pillar: ["an-index-is-a-second-copy-of-your-data", "2026-07-02T15:25:00+01:00"],
    spokes: [
      ["reading-explain-query-plan-scan-versus-search", "2026-07-03T17:10:00+01:00", { maxWords: 1800 }],
      ["what-an-index-costs-on-every-insert", "2026-07-07T22:30:00+01:00", { maxWords: 1800 }],
      ["why-column-order-matters-in-a-composite-index", "2026-07-11T10:00:00+01:00", { maxWords: 1800 }],
      ["a-covering-index-never-touches-the-table", "2026-07-13T16:20:00+01:00", { maxWords: 1800 }],
      ["when-the-database-ignores-your-index", "2026-07-18T07:55:00+01:00", { maxWords: 1800 }],
      ["planner-statistics-go-stale-too-analyze-and-a-plan-that-changes", "2026-07-28T17:25:00+01:00", { maxWords: 1800 }],
      ["partial-and-expression-indexes-index-only-what-you-query", "2026-08-06T20:00:00+01:00", { maxWords: 1800 }],
      ["deleted-rows-do-not-shrink-the-file-free-pages-and-vacuum", "2026-08-17T08:00:00+01:00", { maxWords: 1800 }],
      ["keeping-a-derived-index-in-sync-outside-the-database", "2026-08-19T12:45:00+01:00", { maxWords: 1800 }],
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

function proseWordCount(markdown) {
  return markdownWordCount(markdown.replace(/\]\([^)\s]*\)/g, "]"));
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
    if (cluster.cluster) {
      assert.ok(pillar.content.includes(`/blog/topics/${cluster.cluster}`), pillarSlug);
    }
    const words = proseWordCount(pillar.content);
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
      const words = proseWordCount(article.content);
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
      const liveFrom = Math.max(new Date(date).getTime(), Date.now());
      const internalLinks = [...article.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)/g)].map(
        (match) => match[1]
      );
      for (const target of internalLinks) {
        if (target === "tags" || target === "topics") continue; // site routes, not articles
        assert.ok(existsSync(articlePath(target)), `${slug} links to missing ${target}`);
        const targetDate = scheduledFor.get(target) ?? readArticle(target).data.date;
        assert.ok(
          new Date(targetDate).getTime() <= liveFrom,
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
