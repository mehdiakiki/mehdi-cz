import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
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
        slug: "what-rust-1-93-s-musl-upgrade-changed-for-static-network-binaries",
        title: "What Rust 1.93's musl Upgrade Changed for Static Network Binaries",
        date: "2026-09-01T09:00:00Z",
        draft: false,
        reviewed: true,
        cluster: "rust-under-the-hood",
        campaign: "authority-2026",
        opportunity: "RUST-070",
        summary: "Summary",
        wordCount: 1200,
      },
    ],
    new Date("2026-09-03T12:00:00Z")
  );

  assert.deepEqual(report.backlogErrors.unsafeCampaignPublications, [
    {
      slug: "what-rust-1-93-s-musl-upgrade-changed-for-static-network-binaries",
      opportunity: "RUST-070",
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
      "BufReader-rust",
      "a-record-and-replay-harness-for-agent-tests",
      "a-type-is-a-set-why-human-has-two-members-and-option-human-has-three",
      "aho-corasick-dfa-or-nfa-rust",
      "aho-corasick-match-kinds-standard-leftmost-rust",
      "async-cleanup-in-rust-when-drop-cannot-await",
      "async-fn-in-dyn-trait-what-the-box-costs-measured",
      "behavior-without-shape-traits-interfaces-and-types-that-own-no-bytes",
      "benchmark-streaming-scanner-rust",
      "building-a-sandboxed-code-playground-in-rust",
      "does-a-type-exist-at-runtime-following-one-value-from-source-to-register",
      "eval-scores-move-between-runs-how-to-compare-two-versions-honestly",
      "how-async-rust-works-under-the-hood",
      "pattern-shape-simd-search-performance-rust",
      "reuse-compiled-aho-corasick-searchers-rust",
      "runtime-type-tags-what-dynamic-languages-keep-that-static-ones-throw-away",
      "rust-bufread-slices-memory-mapping-copying",
      "rust-bytes-are-not-text-utf8-scanners",
      "search-across-chunk-boundaries-rust-without-missing-matches",
      "shape-without-behavior-two-structs-with-the-same-fields",
      "test-streaming-algorithms-every-chunk-boundary",
      "the-processor-has-no-types-what-add-does-to-bits-it-does-not-understand",
      "the-unit-of-rebuild-when-you-split-a-rust-workspace",
      "two-ways-to-make-a-type-disappear-erasure-and-monomorphization",
      "types-as-proofs-what-the-checker-knows-that-the-binary-forgets",
      "what-evidence-an-ai-feature-needs-before-you-ship-it",
      "what-is-a-type-a-set-of-values-a-promise-about-operations-or-both",
      "when-aho-corasick-prefilters-help-or-hurt",
      "when-match-reporting-costs-more-than-search",
      "where-a-type-becomes-a-layout-fields-padding-and-reordering",
      "why-aho-corasick-streaming-still-needs-buffer",
      "why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons",
      "why-is-my-rust-build-slow-a-diagnostic-tree",
      "why-more-patterns-can-slow-aho-corasick",
      "why-one-lookup-per-byte-can-be-latency-bound",
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
