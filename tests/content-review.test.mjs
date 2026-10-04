import assert from "node:assert/strict";
import test from "node:test";

import {
  articleReviewHash,
  hasValidReviewHash,
  reviewableArticleSource,
} from "../lib/content-review.mjs";

const source = `---
title: "A reviewed explanation"
date: "2026-09-04T09:00:00+01:00"
draft: true
reviewed: false
reviewedHash: "old"
summary: "A specific summary"
---

The engineering argument.`;

test("release controls do not change the reviewed-content fingerprint", () => {
  const released = source
    .replace("draft: true", "draft: false")
    .replace("reviewed: false", "reviewed: true")
    .replace('reviewedHash: "old"', `reviewedHash: "${articleReviewHash(source)}"`)
    .replace("2026-09-04T09:00:00+01:00", "2026-09-05T15:00:00+01:00")
    .replace(
      'summary: "A specific summary"',
      'campaign: "authority-2026"\nopportunity: "TEST-001"\nsummary: "A specific summary"'
    );

  assert.equal(articleReviewHash(released), articleReviewHash(source));
});

test("an article edit invalidates the review fingerprint", () => {
  const changed = source.replace("The engineering argument.", "A different engineering argument.");

  assert.notEqual(articleReviewHash(changed), articleReviewHash(source));
});

test("review validation requires an exact hash and explicit approval", () => {
  const sourceHash = articleReviewHash(source);

  assert.equal(hasValidReviewHash({ reviewed: true, reviewedHash: sourceHash, sourceHash }), true);
  assert.equal(
    hasValidReviewHash({ reviewed: false, reviewedHash: sourceHash, sourceHash }),
    false
  );
  assert.equal(hasValidReviewHash({ reviewed: true, reviewedHash: "stale", sourceHash }), false);
});

test("the reviewable source retains substantive metadata and body", () => {
  const reviewable = reviewableArticleSource(source);

  assert.match(reviewable, /title: "A reviewed explanation"/);
  assert.match(reviewable, /summary: "A specific summary"/);
  assert.match(reviewable, /The engineering argument\./);
  assert.doesNotMatch(reviewable, /^date:/m);
  assert.doesNotMatch(reviewable, /^reviewedHash:/m);

  const withWorkflowMetadata = source.replace(
    'summary: "A specific summary"',
    'campaign: "authority-2026"\nopportunity: "TEST-001"\nsummary: "A specific summary"'
  );
  assert.doesNotMatch(reviewableArticleSource(withWorkflowMetadata), /^campaign:/m);
  assert.doesNotMatch(reviewableArticleSource(withWorkflowMetadata), /^opportunity:/m);
});
