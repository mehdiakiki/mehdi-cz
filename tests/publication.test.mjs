import assert from "node:assert/strict";
import test from "node:test";

import { heldArticleSlugs } from "../data/publication-hold.mjs";
import {
  filterPublishedPosts,
  filterVisiblePosts,
  isPostPublished,
  publicationDate,
  publicationStatus,
} from "../lib/publication.mjs";

const now = new Date("2026-09-03T12:00:00Z");

test("a held article never publishes, even after its date passes", () => {
  const slug = "publication-hold-test-fixture";
  const post = { slug, date: "2026-01-01T00:00:00Z", draft: false, reviewed: true };

  heldArticleSlugs.add(slug);
  try {
    assert.equal(publicationStatus(post, new Date("2027-01-01T00:00:00Z")), "held");
    assert.equal(isPostPublished(post, new Date("2027-01-01T00:00:00Z")), false);
  } finally {
    heldArticleSlugs.delete(slug);
  }
});

test("drafts never publish automatically", () => {
  const post = { date: "2026-09-01T09:00:00Z", draft: true };

  assert.equal(publicationStatus(post, now), "draft");
});

test("an explicitly unreviewed post cannot publish or schedule", () => {
  const duePost = { date: "2026-09-01T09:00:00Z", draft: false, reviewed: false };
  const futurePost = { date: "2026-09-04T09:00:00Z", draft: false, reviewed: false };

  assert.equal(publicationStatus(duePost, now), "unapproved");
  assert.equal(publicationStatus(futurePost, now), "unapproved");
  assert.deepEqual(filterPublishedPosts([duePost, futurePost], now), []);
});

test("campaign metadata requires reviewed:true at runtime", () => {
  const post = {
    date: "2026-09-01T09:00:00Z",
    draft: false,
    campaign: "authority-2026",
    opportunity: "DATA-001",
  };

  assert.equal(publicationStatus(post, now), "unapproved");
  assert.deepEqual(filterPublishedPosts([post], now), []);
});

test("a reviewed post follows the normal publication date", () => {
  const post = { date: "2026-09-04T09:00:00Z", draft: false, reviewed: true };

  assert.equal(publicationStatus(post, now), "scheduled");
});

test("a post remains scheduled until its exact publication instant", () => {
  const post = { date: "2026-09-03T12:00:01Z", draft: false };

  assert.equal(publicationStatus(post, now), "scheduled");
  assert.equal(publicationStatus(post, new Date(post.date)), "published");
});

test("invalid dates fail closed", () => {
  const post = { date: "not-a-date", draft: false };

  assert.equal(publicationDate(post), null);
  assert.equal(publicationStatus(post, now), "invalid");
  assert.deepEqual(filterPublishedPosts([post], now), []);
});

test("malformed publication locks fail closed", () => {
  assert.equal(publicationStatus({ date: now, draft: "false" }, now), "invalid");
  assert.equal(publicationStatus({ date: now, draft: false, reviewed: "false" }, now), "invalid");
});

test("production visibility excludes drafts and scheduled posts", () => {
  const posts = [
    { slug: "published", date: "2026-09-01T09:00:00Z", draft: false },
    { slug: "scheduled", date: "2026-09-04T09:00:00Z", draft: false },
    { slug: "draft", date: "2026-09-01T09:00:00Z", draft: true },
  ];

  assert.deepEqual(
    filterVisiblePosts(posts, { now, preview: false }).map((post) => post.slug),
    ["published"]
  );
});

test("development visibility keeps drafts and scheduled posts previewable", () => {
  const posts = [
    { slug: "published", date: "2026-09-01T09:00:00Z", draft: false },
    { slug: "scheduled", date: "2026-09-04T09:00:00Z", draft: false },
    { slug: "draft", date: "2026-09-01T09:00:00Z", draft: true },
  ];

  assert.deepEqual(
    filterVisiblePosts(posts, { now, preview: true }).map((post) => post.slug),
    ["published", "scheduled", "draft"]
  );
});
