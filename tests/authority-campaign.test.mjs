import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  authorityUpgradeBaselines,
  authorityUpgradePublishedDates,
} from "../data/authority-upgrade-baselines.mjs";
import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import {
  auditAuthorityCampaign,
  markdownWordCount,
  parseCampaignPost,
  readCampaignPosts,
} from "../scripts/audit-authority-campaign.mjs";
import { articleReviewHash } from "../lib/content-review.mjs";

const sqlRustSeries = JSON.parse(
  readFileSync(
    new URL("../docs/editorial/sql-rust-proposed-series-2026-10-25.json", import.meta.url),
    "utf8"
  )
);

test("markdown word count ignores fenced code and inline markup", () => {
  assert.equal(markdownWordCount("One **clear** model.\n\n```rust\nlet hidden = true;\n```"), 3);
});

test("campaign parser keeps the explicit review gate", () => {
  const post = parseCampaignPost(
    `---
title: "A focused article"
date: "2026-09-10T09:00:00+01:00"
draft: true
reviewed: false
cluster: "rust-under-the-hood"
summary: "A useful summary."
---
This is the article body.`,
    "/tmp/a-focused-article.mdx"
  );

  assert.equal(post.slug, "a-focused-article");
  assert.equal(post.reviewed, false);
  assert.equal(post.cluster, "rust-under-the-hood");
});

test("campaign audit reports unknown clusters and missing review gates", () => {
  const report = auditAuthorityCampaign(
    [
      {
        slug: "rust-async-future-size",
        title: "Known",
        date: "2026-09-01T09:00:00Z",
        draft: true,
        cluster: "rust-under-the-hood",
        summary: "Summary",
        wordCount: 900,
      },
      {
        slug: "unknown",
        title: "Unknown",
        date: "2026-09-01T09:00:00Z",
        draft: false,
        cluster: "everything-about-code",
        summary: "Summary",
        wordCount: 900,
      },
    ],
    new Date("2026-09-03T12:00:00Z")
  );

  assert.deepEqual(report.invalidClusters, [{ slug: "unknown", cluster: "everything-about-code" }]);
  assert.deepEqual(report.clusters["rust-under-the-hood"].qualityFlags.draftWithoutReviewGate, [
    "rust-async-future-size",
  ]);
});

test("the authority backlog contains 200 unique opportunities in valid workflow states", async () => {
  const { authorityOpportunities } = await import("../data/authority-opportunities.mjs");

  assert.equal(authorityOpportunities.length, 200);
  assert.equal(new Set(authorityOpportunities.map((item) => item.id)).size, 200);
  assert.equal(
    new Set(authorityOpportunities.map((item) => item.workingTitle.trim().toLowerCase())).size,
    200
  );
  assert.equal(new Set(authorityOpportunities.map((item) => item.slug)).size, 200);
  assert.ok(
    authorityOpportunities.every(
      (item) => item.workingTitle.trim().length >= 25 && item.workingTitle.trim().length <= 90
    )
  );
  assert.ok(
    authorityOpportunities.every((item) =>
      ["pending", "validated", "rejected"].includes(item.validation)
    )
  );
  assert.ok(
    authorityOpportunities.every((item) =>
      ["hold", "approved", "merge", "kill"].includes(item.publishDecision)
    )
  );
  assert.ok(
    authorityOpportunities.every(
      (item) => item.publishDecision !== "approved" || item.validation === "validated"
    )
  );
});

test("a reviewed campaign article still needs an exact content review hash", () => {
  const report = auditAuthorityCampaign(
    [
      {
        slug: "why-procedural-macro-errors-point-at-the-wrong-code",
        title: "Why Procedural Macro Errors Point at the Wrong Code",
        date: "2026-09-01T09:00:00Z",
        draft: false,
        reviewed: true,
        cluster: "rust-under-the-hood",
        campaign: "authority-2026",
        opportunity: "RUST-007",
        summary: "Summary",
        wordCount: 1200,
      },
    ],
    new Date("2026-09-03T12:00:00Z")
  );

  assert.deepEqual(report.backlogErrors.unsafeCampaignPublications, [
    {
      slug: "why-procedural-macro-errors-point-at-the-wrong-code",
      opportunity: "RUST-007",
      reason: "review hash is missing or stale",
    },
  ]);
});

test("removing reviewed cannot make a known campaign draft publish", () => {
  const report = auditAuthorityCampaign(
    [
      {
        slug: "rust-async-future-size",
        title: "Why Rust Async Futures Get So Large",
        date: "2026-09-04T15:00:00+01:00",
        draft: false,
        cluster: "rust-under-the-hood",
        campaign: "authority-2026",
        opportunity: "RUST-026",
        summary: "Summary",
        wordCount: 1200,
        sourceHash: "source",
      },
    ],
    new Date("2026-09-05T12:00:00Z")
  );

  assert.ok(
    report.backlogErrors.campaignPostErrors[0].errors.includes("reviewed must be explicit")
  );
  assert.deepEqual(report.backlogErrors.unsafeCampaignPublications, []);
});

test("a known opportunity slug stays protected if both campaign fields are removed", () => {
  const report = auditAuthorityCampaign(
    [
      {
        slug: "rust-async-future-size",
        title: "Why Rust Async Futures Get So Large",
        date: "2026-09-04T15:00:00+01:00",
        draft: false,
        cluster: "rust-under-the-hood",
        summary: "Summary",
        wordCount: 1200,
        sourceHash: "source",
      },
    ],
    new Date("2026-09-05T12:00:00Z")
  );

  const errors = report.backlogErrors.campaignPostErrors[0].errors;
  assert.ok(errors.includes("missing authority-2026 campaign marker"));
  assert.ok(errors.includes("missing opportunity frontmatter"));
  assert.equal(report.backlogErrors.unsafeCampaignPublications[0].slug, "rust-async-future-size");
});

test("placeholder detection covers the summary as well as the body", () => {
  const withoutHash = `---
title: "A complete title"
date: "2026-09-04T15:00:00+01:00"
draft: true
reviewed: true
cluster: "rust-under-the-hood"
campaign: "authority-2026"
opportunity: "RUST-026"
summary: "TODO: replace this summary"
---
The explanation is otherwise complete.`;
  const source = withoutHash.replace(
    "reviewed: true",
    `reviewed: true\nreviewedHash: "${articleReviewHash(withoutHash)}"`
  );
  const post = parseCampaignPost(source, "/tmp/rust-async-future-size.mdx");
  const report = auditAuthorityCampaign([post], new Date("2026-09-03T12:00:00Z"));

  assert.equal(post.hasPlaceholders, true);
  assert.ok(
    report.backlogErrors.campaignPostErrors[0].errors.includes("reviewed article has placeholders")
  );
});

test("the repository maps every written campaign source without counting unrelated articles", async () => {
  const posts = await readCampaignPosts(fileURLToPath(new URL("../data/blog", import.meta.url)));
  const report = auditAuthorityCampaign(posts, new Date("2026-09-03T12:00:00Z"));
  const writtenOpportunityCount = authorityOpportunities.filter(
    (opportunity) => opportunity.stage !== "brief" || opportunity.publishDecision === "approved"
  ).length;

  assert.equal(report.mappedPages, writtenOpportunityCount);
  assert.deepEqual(
    report.unrelatedClusteredPosts.map((post) => post.slug).sort(),
    [
      ...sqlRustSeries.articles.map((article) => article.slug),
      "BufReader-rust",
      "a-filename-became-a-shell-command",
      "a-record-and-replay-harness-for-agent-tests",
      "a-type-is-a-set-why-human-has-two-members-and-option-human-has-three",
      "aho-corasick-dfa-or-nfa-rust",
      "aho-corasick-match-kinds-standard-leftmost-rust",
      "an-append-only-log-that-survives-a-torn-last-record",
      "async-cleanup-in-rust-when-drop-cannot-await",
      "async-fn-in-dyn-trait-what-the-box-costs-measured",
      "behavior-without-shape-traits-interfaces-and-types-that-own-no-bytes",
      "benchmark-streaming-scanner-rust",
      "blocking-http-did-not-block-the-way-out",
      "building-a-sandboxed-code-playground-in-rust",
      "building-a-tiny-crash-simulator-from-strace-output",
      "checkpointing-a-log-without-losing-the-tail",
      "checksums-catching-corruption-the-disk-did-not-report",
      "could-this-feature-run-entirely-in-the-browser",
      "does-a-type-exist-at-runtime-following-one-value-from-source-to-register",
      "does-this-search-need-a-vector-database",
      "durability-settings-that-trade-your-data-for-speed",
      "eval-scores-move-between-runs-how-to-compare-two-versions-honestly",
      "every-new-commit-cancelled-the-check-that-mattered",
      "following-one-slow-request-through-an-app",
      "group-commit-how-databases-make-fsync-cheaper",
      "how-a-call-to-printf-finds-printf-the-plt-and-the-got",
      "how-a-name-becomes-an-address-what-getaddrinfo-really-does",
      "how-a-stack-overflow-is-detected-guard-pages-and-signals",
      "how-async-rust-works-under-the-hood",
      "how-each-thread-gets-its-own-copy-of-a-variable-thread-local-storage",
      "how-ld-preload-replaces-a-function-without-recompiling",
      "how-sqlite-commits-a-transaction-followed-with-strace",
      "how-the-dynamic-loader-finds-a-shared-library",
      "how-to-save-a-file-without-losing-it-write-fsync-rename",
      "localhost-is-not-an-admin-password",
      "pattern-shape-simd-search-performance-rust",
      "prompt-for-one-verifiable-change",
      "reading-proc-self-maps-line-by-line",
      "recovery-code-must-survive-a-crash-too",
      "relocations-the-holes-the-compiler-leaves-for-the-linker",
      "reuse-compiled-aho-corasick-searchers-rust",
      "runtime-type-tags-what-dynamic-languages-keep-that-static-ones-throw-away",
      "rust-bufread-slices-memory-mapping-copying",
      "rust-bytes-are-not-text-utf8-scanners",
      "search-across-chunk-boundaries-rust-without-missing-matches",
      "shape-without-behavior-two-structs-with-the-same-fields",
      "sometimes-the-escape-is-in-the-runtime",
      "sqlite-wal-mode-fewer-fsyncs-a-different-promise",
      "static-or-dynamic-linking-what-changes-in-the-binary-and-at-startup",
      "test-streaming-algorithms-every-chunk-boundary",
      "testing-crash-recovery-kill-9-fault-injection-and-simulation",
      "the-accept-queue-what-happens-when-a-server-accepts-too-slowly",
      "the-agent-finished-the-pipeline-did-not",
      "the-agent-learned-to-ignore-the-check",
      "the-agent-made-the-flaky-test-green",
      "the-api-changed-the-old-mobile-app-did-not",
      "the-build-was-green-and-nobody-understood-the-change",
      "the-cache-made-the-build-fast-and-wrong",
      "the-child-process-inherited-the-secret",
      "the-code-that-runs-before-main-start-constructors-and-init-array",
      "the-monorepo-ran-every-test-for-a-small-change",
      "the-next-agent-read-the-previous-jobs-files",
      "the-processor-has-no-types-what-add-does-to-bits-it-does-not-understand",
      "the-readme-asked-for-a-different-job",
      "the-review-queue-outgrew-the-build-queue",
      "the-safe-path-changed-before-it-was-opened",
      "the-sandbox-stayed-closed-the-file-helper-did-not",
      "the-scheduler-worked-and-the-article-never-appeared",
      "the-test-passed-on-the-wrong-commit",
      "the-timeout-ended-one-process-not-the-job",
      "the-unit-of-rebuild-when-you-split-a-rust-workspace",
      "the-zero-length-file-problem-and-what-ext4-does-about-it",
      "time-wait-why-a-closed-connection-stays-around",
      "two-ways-to-make-a-type-disappear-erasure-and-monomorphization",
      "types-as-proofs-what-the-checker-knows-that-the-binary-forgets",
      "updating-several-files-at-once-with-one-rename",
      "what-a-connection-pool-saves-and-the-stale-connection-it-gives-back",
      "what-a-crash-in-the-middle-of-a-write-leaves-behind",
      "what-a-full-socket-buffer-does-to-the-sender",
      "what-a-system-call-costs-and-why-some-calls-skip-the-kernel",
      "what-a-tls-handshake-costs",
      "what-breaks-when-rust-reaches-1-100",
      "what-can-an-ai-agent-reach-from-its-sandbox",
      "what-close-really-sends-fin-rst-and-unread-data",
      "what-evidence-an-ai-feature-needs-before-you-ship-it",
      "what-fork-really-copies-copy-on-write-measured",
      "what-fsync-costs-on-a-laptop-ssd",
      "what-happens-when-a-process-exits",
      "what-happens-when-you-run-a-program-from-execve-to-main",
      "what-happens-when-your-program-calls-connect",
      "what-is-a-type-a-set-of-values-a-promise-about-operations-or-both",
      "what-is-inside-an-executable-file-elf-headers-segments-and-sections",
      "what-is-on-the-stack-when-a-process-starts-argv-envp-and-auxv",
      "when-aho-corasick-prefilters-help-or-hurt",
      "when-fsync-fails-what-postgresql-learned-in-2018",
      "when-malloc-asks-the-kernel-for-memory-brk-and-mmap",
      "when-match-reporting-costs-more-than-search",
      "when-more-threads-make-a-service-slower",
      "where-a-type-becomes-a-layout-fields-padding-and-reordering",
      "where-variables-live-in-a-binary-text-rodata-data-and-bss",
      "why-a-small-write-can-wait-40-milliseconds-nagle-and-delayed-ack",
      "why-aho-corasick-streaming-still-needs-buffer",
      "why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons",
      "why-freeing-memory-does-not-shrink-your-process",
      "why-is-my-rust-build-slow-a-diagnostic-tree",
      "why-more-patterns-can-slow-aho-corasick",
      "why-one-lookup-per-byte-can-be-latency-bound",
      "why-postgresql-stopped-using-the-index",
      "why-recv-returns-less-than-you-asked-tcp-is-a-byte-stream",
      "why-the-directory-needs-fsync-too",
      "why-the-first-touch-of-memory-is-slow-demand-paging-measured",
      "why-undefined-reference-is-a-linker-error-not-a-compiler-error",
      "write-ahead-logging-from-scratch",
      "writing-through-mmap-who-decides-when-data-reaches-the-disk",
      "your-data-is-not-on-disk-when-write-returns",
      "zero-copy-does-not-mean-zero-memory-access-aho-corasick-rust",
    ].sort()
  );
  assert.deepEqual(report.backlogErrors.sourceMappingErrors, []);
  assert.deepEqual(report.backlogErrors.upgradeBaselineErrors, []);
});

test("a changed upgrade cannot hide a live URL behind draft locks", () => {
  const report = auditAuthorityCampaign(
    [
      {
        slug: "reconciliation-cross-system-sync",
        title: "A revised synchronization article",
        date: authorityUpgradePublishedDates["DATA-004"],
        lastmod: "2026-09-04T12:00:00+01:00",
        draft: true,
        reviewed: false,
        cluster: "reliable-data-integrations",
        campaign: "authority-2026",
        opportunity: "DATA-004",
        summary: "Summary",
        wordCount: 1200,
        sourceHash: "f".repeat(64),
      },
    ],
    new Date("2026-09-03T12:00:00Z")
  );

  const revision = report.backlogErrors.upgradeRevisionErrors.find(
    (error) => error.id === "DATA-004"
  );
  assert.ok(revision.errors.includes("upgrade must remain public with draft:false"));
  assert.ok(revision.errors.includes("upgrade review hash is missing or stale"));
});

test("workflow metadata alone cannot count as an upgrade", () => {
  const sourceHash = authorityUpgradeBaselines["DATA-004"];
  const report = auditAuthorityCampaign(
    [
      {
        slug: "reconciliation-cross-system-sync",
        title: "Unchanged article",
        date: authorityUpgradePublishedDates["DATA-004"],
        draft: false,
        reviewed: true,
        reviewedHash: sourceHash,
        cluster: "reliable-data-integrations",
        campaign: "authority-2026",
        opportunity: "DATA-004",
        summary: "Summary",
        wordCount: 1200,
        sourceHash,
        hasPlaceholders: false,
      },
    ],
    new Date("2026-09-03T12:00:00Z")
  );

  assert.ok(
    report.backlogErrors.upgradeRevisionErrors[0].errors.includes(
      "upgrade workflow metadata was added without a substantive revision"
    )
  );
  assert.equal(report.clusters["reliable-data-integrations"].completedUpgrades, 0);
});

test("a fully validated upgrade with an exact review hash is accepted", async () => {
  const { authorityOpportunities } = await import("../data/authority-opportunities.mjs");
  const opportunity = authorityOpportunities.find((item) => item.id === "DATA-004");
  const original = { ...opportunity };
  const sourceHash = "f".repeat(64);

  Object.assign(opportunity, {
    validation: "validated",
    publishDecision: "approved",
    canonicalSources: ["https://www.rfc-editor.org/"],
  });

  try {
    const report = auditAuthorityCampaign(
      [
        {
          slug: opportunity.slug,
          title: "A revised synchronization article",
          date: authorityUpgradePublishedDates["DATA-004"],
          lastmod: "2026-09-04T12:00:00+01:00",
          draft: false,
          reviewed: true,
          reviewedHash: sourceHash,
          cluster: opportunity.cluster,
          campaign: "authority-2026",
          opportunity: opportunity.id,
          summary: "Summary",
          wordCount: 1200,
          sourceHash,
          hasPlaceholders: false,
        },
      ],
      new Date("2026-09-04T11:00:00Z")
    );

    assert.deepEqual(report.backlogErrors.upgradeRevisionErrors, []);
    assert.deepEqual(report.backlogErrors.unsafeCampaignPublications, []);
  } finally {
    for (const key of Object.keys(opportunity)) delete opportunity[key];
    Object.assign(opportunity, original);
  }
});

test("a fully validated new article can remain safely scheduled", async () => {
  const { authorityOpportunities } = await import("../data/authority-opportunities.mjs");
  const opportunity = authorityOpportunities.find((item) => item.id === "RUST-026");
  const original = { ...opportunity };
  const sourceHash = "e".repeat(64);

  Object.assign(opportunity, {
    validation: "validated",
    publishDecision: "approved",
    canonicalSources: ["https://doc.rust-lang.org/"],
  });

  try {
    const report = auditAuthorityCampaign(
      [
        {
          slug: opportunity.slug,
          title: "Why Rust Async Futures Get So Large",
          date: "2026-09-04T15:00:00+01:00",
          draft: false,
          reviewed: true,
          reviewedHash: sourceHash,
          cluster: opportunity.cluster,
          campaign: "authority-2026",
          opportunity: opportunity.id,
          summary: "A measured explanation of generated future size.",
          wordCount: 1200,
          sourceHash,
          hasPlaceholders: false,
        },
      ],
      new Date("2026-09-03T12:00:00Z")
    );

    assert.deepEqual(report.backlogErrors.campaignPostErrors, []);
    assert.deepEqual(report.backlogErrors.unsafeCampaignPublications, []);
    assert.deepEqual(report.backlogErrors.calendarDateMismatches, []);
  } finally {
    for (const key of Object.keys(opportunity)) delete opportunity[key];
    Object.assign(opportunity, original);
  }
});
