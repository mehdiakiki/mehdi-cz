import assert from "node:assert/strict";
import test from "node:test";

import { authorityUpgradeBaselines } from "../data/authority-upgrade-baselines.mjs";
import { authorityCalendar } from "../lib/authority-schedule.mjs";
import {
  checkLivePublications,
  missingDuePublications,
  overdueAuthorityActions,
  parsePublicationFrontmatter,
  sitemapPaths,
} from "../scripts/check-publication-due.mjs";

const now = new Date("2026-09-03T12:00:00Z");
const posts = [
  {
    title: "Already live",
    path: "/blog/already-live",
    date: "2026-09-01T09:00:00Z",
    draft: false,
  },
  {
    title: "Due now",
    path: "/blog/due-now",
    date: "2026-09-03T12:00:00Z",
    draft: false,
  },
  {
    title: "Tomorrow",
    path: "/blog/tomorrow",
    date: "2026-09-04T09:00:00Z",
    draft: false,
  },
  {
    title: "Draft",
    path: "/blog/draft",
    date: "2026-09-01T09:00:00Z",
    draft: true,
  },
];

const liveSitemap = `<?xml version="1.0"?>
<urlset>
  <url><loc>https://www.mehdi.cz/blog/already-live</loc></url>
</urlset>`;

test("frontmatter parser accepts quoted ISO timestamps and drafts", () => {
  const parsed = parsePublicationFrontmatter(`---
title: "Scheduled article"
date: "2026-09-04T09:00:00+01:00"
draft: false
reviewed: false
---
Body`);

  assert.equal(parsed.title, "Scheduled article");
  assert.equal(parsed.date, "2026-09-04T09:00:00+01:00");
  assert.equal(parsed.draft, false);
  assert.equal(parsed.reviewed, false);
  assert.match(parsed.sourceHash, /^[a-f0-9]{64}$/);
});

test("frontmatter parser rejects invalid publication dates", () => {
  assert.throws(
    () => parsePublicationFrontmatter("---\ntitle: Bad\ndate: tomorrow\n---\n"),
    /invalid publication date/
  );
});

test("frontmatter parser rejects malformed safety locks", () => {
  assert.throws(
    () => parsePublicationFrontmatter("---\ndate: 2026-09-04\ndraft: yes\n---\n"),
    /draft must be true or false/
  );
  assert.throws(
    () => parsePublicationFrontmatter("---\ndate: 2026-09-04\nreviewed: no\n---\n"),
    /reviewed must be true or false/
  );
});

test("sitemap parsing normalizes trailing slashes", () => {
  assert.deepEqual(
    [...sitemapPaths("<loc>https://www.mehdi.cz/blog/example/</loc>")],
    ["/blog/example"]
  );
});

test("only due, non-draft, missing posts trigger publication", () => {
  assert.deepEqual(
    missingDuePublications(posts, liveSitemap, now).map((post) => post.path),
    ["/blog/due-now"]
  );
});

test("live check skips deployment when every due post is present", async () => {
  const completeSitemap = `${liveSitemap}<loc>https://www.mehdi.cz/blog/due-now</loc>`;
  const result = await checkLivePublications({
    posts,
    siteUrl: "https://www.mehdi.cz",
    now,
    fetchImpl: async () => new Response(completeSitemap, { status: 200 }),
  });

  assert.equal(result.shouldDeploy, false);
  assert.equal(result.checkFailed, false);
  assert.deepEqual(result.missing, []);
});

test("live check requests deployment for a due missing post", async () => {
  const result = await checkLivePublications({
    posts,
    siteUrl: "https://www.mehdi.cz",
    now,
    fetchImpl: async () => new Response(liveSitemap, { status: 200 }),
  });

  assert.equal(result.shouldDeploy, true);
  assert.equal(result.checkFailed, false);
  assert.deepEqual(
    result.missing.map((post) => post.path),
    ["/blog/due-now"]
  );
});

test("live check fails closed when the sitemap is unavailable", async () => {
  const result = await checkLivePublications({
    posts,
    siteUrl: "https://www.mehdi.cz",
    now,
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
  });

  assert.equal(result.shouldDeploy, false);
  assert.equal(result.checkFailed, true);
  assert.match(result.reason, /network unavailable/);
});

test("a due campaign brief without a source file is reported overdue", () => {
  const overdue = overdueAuthorityActions([], new Date("2026-09-04T08:00:00Z"));

  assert.ok(overdue.some((entry) => entry.id === "DATA-001"));
  assert.equal(overdue.find((entry) => entry.id === "DATA-001").reason, "source file is missing");
});

test("a due held draft is reported overdue instead of becoming a green no-op", () => {
  const overdue = overdueAuthorityActions(
    [
      {
        slug: "stable-internal-model-api-integrations",
        date: "2026-09-04T09:00:00+01:00",
        draft: true,
        reviewed: false,
      },
    ],
    new Date("2026-09-04T08:00:00Z")
  );

  assert.equal(overdue.find((entry) => entry.id === "DATA-001").reason, "article is draft");
});

test("a due unchanged public URL is reported as an unfinished upgrade", () => {
  const overdue = overdueAuthorityActions(
    [
      {
        slug: "reconciliation-cross-system-sync",
        date: "2025-01-01",
        draft: false,
        sourceHash: authorityUpgradeBaselines["DATA-004"],
      },
    ],
    new Date("2026-09-04T11:00:00Z"),
    { upgradeDeadlinesPaused: false }
  );

  assert.equal(
    overdue.find((entry) => entry.id === "DATA-004").reason,
    "upgrade has not changed from its baseline"
  );
});

test("paused upgrade deadlines are not reported overdue", () => {
  const overdue = overdueAuthorityActions(
    [
      {
        slug: "reconciliation-cross-system-sync",
        date: "2025-01-01",
        draft: false,
        sourceHash: authorityUpgradeBaselines["DATA-004"],
      },
    ],
    new Date("2026-09-04T11:00:00Z"),
    { upgradeDeadlinesPaused: true }
  );

  assert.equal(
    overdue.find((entry) => entry.id === "DATA-004"),
    undefined
  );
});

test("a held article's passed slot is paused, not overdue", () => {
  const entry = authorityCalendar.find((item) => item.action === "publish");
  const overdue = overdueAuthorityActions([], new Date(entry.scheduledFor), {
    held: new Set([entry.slug]),
    upgradeDeadlinesPaused: true,
  });

  assert.equal(
    overdue.find((item) => item.id === entry.id),
    undefined
  );
});
