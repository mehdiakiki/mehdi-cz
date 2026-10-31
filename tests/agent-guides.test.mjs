import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { heldArticleSlugs } from "../data/publication-hold.mjs";
import { articleReviewHash } from "../lib/content-review.mjs";
import { guidePaths, reviewedGuide, guideIndex, llmsText } from "../lib/agent-guides.mjs";

const catalog = JSON.parse(readFileSync("data/agent-guides.json", "utf8"));
const now = new Date("2026-11-01T00:00:00Z");
const sources = catalog.guides.map((guide) => readFileSync(`data/blog/${guide.slug}.mdx`, "utf8"));

test("the three exports preserve the complete reviewed bodies and Rust examples", () => {
  assert.equal(catalog.guides.length, 3);
  const guides = catalog.guides.map((guide, i) => {
    const result = reviewedGuide(catalog, guide, sources[i], now);
    assert.ok(result, guide.slug);
    const body = matter(sources[i]).content.trimStart();
    assert.ok(result.markdown.endsWith(body));
    assert.ok(!result.markdown.includes("reviewedHash:"));
    assert.ok(!result.markdown.includes("draft:"));
    assert.equal(result.entry.author, "Mehdi Akiki");
    assert.equal(result.entry.htmlUrl, catalog.siteUrl + result.paths.html);
    assert.deepEqual(
      [...result.markdown.matchAll(/^```([^\n]*)/gm)].map((match) => match[1]).filter(Boolean),
      [...body.matchAll(/^```([^\n]*)/gm)].map((match) => match[1]).filter(Boolean)
    );
    for (const evidence of guide.evidence) {
      const path = new URL(evidence.url).pathname.split("/").slice(5).join("/");
      assert.ok(path.endsWith(".rs"));
      assert.ok(readFileSync(path, "utf8").length > 0);
    }
    return result;
  });
  const index = guideIndex(catalog, guides);
  assert.equal(index.guides.length, 3);
  for (const guide of guides) {
    assert.ok(llmsText(catalog, guides).includes(guide.entry.markdownUrl));
  }
});

test("preview mode cannot export drafts, held, scheduled, invalid, or unreviewed articles", () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const guide = catalog.guides[0];
    const source = sources[0];
    for (const replacement of [
      ["draft: false", "draft: true"],
      ["draft: false", 'draft: "false"'],
      ["reviewed: true", "reviewed: false"],
      ["reviewed: true", 'reviewed: "true"'],
      ["reviewed: true\n", ""],
      ['date: "2026-10-30T10:02:25Z"', 'date: "2099-01-01T00:00:00Z"'],
      ['date: "2026-10-30T10:02:25Z"', 'date: "invalid"'],
    ]) {
      assert.ok(source.includes(replacement[0]));
      assert.equal(reviewedGuide(catalog, guide, source.replace(...replacement), now), null);
    }
    const held = "held-agent-guide-fixture";
    heldArticleSlugs.add(held);
    try {
      assert.equal(reviewedGuide(catalog, { ...guide, slug: held }, source, now), null);
    } finally {
      heldArticleSlugs.delete(held);
    }
    assert.equal(reviewedGuide(catalog, guide, source + "\nChanged after review.\n", now), null);
    assert.equal(
      reviewedGuide(catalog, { ...guide, reviewedHash: "0".repeat(64) }, source, now),
      null
    );
    assert.equal(guideIndex(catalog, []).guides.length, 0);
    assert.ok(!llmsText(catalog, []).includes(guidePaths(guide.slug).markdown));
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
});

test("the source reference must be refreshed even when only release metadata changes", () => {
  const changed = sources[0].replace(
    'lastmod: "2026-10-31T19:37:31Z"',
    'lastmod: "2026-10-31T20:00:00Z"'
  );
  assert.notEqual(changed, sources[0]);
  assert.throws(() => reviewedGuide(catalog, catalog.guides[0], changed, now), /immutable source/);
});

test("MDX components need a reviewed plain-text alternative before export", () => {
  for (const extra of ["\n<Chart />\n", "\nexport const value = 1\n", "\n{value}\n"]) {
    let source = sources[0] + extra;
    const hash = articleReviewHash(source);
    source = source.replace(catalog.guides[0].reviewedHash, hash);
    const guide = {
      ...catalog.guides[0],
      reviewedHash: hash,
      sourceHash: createHash("sha256").update(source).digest("hex"),
    };
    assert.throws(() => reviewedGuide(catalog, guide, source, now), /plain Markdown alternative/);
  }
});

test("an untrusted path cannot become a source or export path", () => {
  for (const slug of ["../draft", "/secret", "a/b", "a.md", "%2e%2e", "a?draft=true", ""]) {
    assert.throws(() => guidePaths(slug), /plain article slug/);
  }
});

test("task lookup includes the observation that changes the diagnosis and its limits", () => {
  // Contract checks for retrieval metadata, not a live-model quality evaluation.
  const tasks = [
    {
      question: "The pool is full but PostgreSQL is idle. What should I inspect?",
      slug: "rust-request-waiting-for-pool-or-postgresql",
      evidence: /checked out/,
      limit: /connection creation/,
    },
    {
      question: "The future timed out. Is it safe to retry the write as a new operation?",
      slug: "rust-timeout-does-not-stop-postgresql-query",
      evidence: /separate connection/,
      limit: /retains the connection/,
    },
    {
      question: "The bounded channel has one item. Why are producers retaining four batches?",
      slug: "bounded-rust-channel-database-producer-memory",
      evidence: /32,768/,
      limit: /not RSS/,
    },
  ];
  for (const task of tasks) {
    const guide = catalog.guides.find((candidate) => candidate.slug === task.slug);
    assert.ok(guide, task.question);
    assert.match(JSON.stringify(guide.checks), task.evidence);
    assert.match(guide.limitations.join(" "), task.limit);
    assert.ok(guide.evidence.length > 0);
  }
});

test("the applicability versions match the pinned Rust fixture and database workflow", () => {
  const manifest = readFileSync("experiments/sql-rust/postgres-sqlite/Cargo.toml", "utf8");
  const workflow = readFileSync(".github/workflows/content-safety.yml", "utf8");
  for (const guide of catalog.guides) {
    assert.ok(manifest.includes(`version = "=${guide.testedWith.sqlx}"`));
    assert.ok(manifest.includes(`version = "=${guide.testedWith.tokio}"`));
    assert.equal(guide.testedWith.postgresql, "18.6");
    assert.ok(workflow.includes('SQL_RUST_PG_EXPECT_VERSION_NUM: "180006"'));
  }
});
