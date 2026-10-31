import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");

const release = JSON.parse(
  await readFile("docs/editorial/ai-writing-release-2026-10-31.json", "utf8")
);
const revisions = JSON.parse(
  await readFile("docs/editorial/ai-era-sql-2026-10-31/release.json", "utf8")
);
assert.equal(release.articles.length, 6);
assert.equal(new Set(release.articles.map((entry) => entry.slug)).size, 6);
assert.equal(release.articles.filter((entry) => entry.kind === "new").length, 3);
assert.equal(release.articles.filter((entry) => entry.kind === "update").length, 3);
const boundary = new Date(release.publish_at);
for (const entry of release.articles) {
  assert.equal(entry.path, `data/blog/${entry.slug}.mdx`);
  const source = await readFile(entry.path, "utf8");
  const { data } = matter(source);
  assert.deepEqual(data.authors, ["default"], entry.slug);
  assert.equal(data.title, entry.title);
  assert.equal(data.draft, false, entry.slug);
  assert.equal(data.reviewed, true, entry.slug);
  assert.equal(data.reviewedHash, articleReviewHash(source), entry.slug);
  const revision = revisions.articles.find(
    (item) => item.kind === "revision" && item.slug === entry.slug
  );
  if (revision) {
    assert.equal(revision.previousReviewedHash, entry.reviewedHash, entry.slug);
  }
  assert.equal(data.reviewedHash, revision?.reviewedHash ?? entry.reviewedHash, entry.slug);
  assert.equal(data.date, entry.date, entry.slug);
  assert.equal(data.lastmod, revision?.lastmod ?? release.publish_at, entry.slug);
  assert.equal(publicationStatus(data, boundary), "published", entry.slug);
  if (entry.kind === "new") {
    assert.equal(data.date, release.publish_at);
    assert.equal(
      publicationStatus(data, new Date(boundary.getTime() - 1)),
      "scheduled",
      entry.slug
    );
  }
  assert.equal(publicationStatus({ ...data, draft: true }, boundary), "draft");
  assert.equal(publicationStatus({ ...data, reviewed: false }, boundary), "unapproved");
  console.log(`Checked release, author and exact review hash: ${entry.slug}`);
}

function unindent(text) {
  const lines = text.trimEnd().replace(/^\n/, "").split("\n");
  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length)
  );
  return lines.map((line) => line.slice(indentation)).join("\n");
}

const cases = [
  {
    article: "data/blog/rust-request-waiting-for-pool-or-postgresql.mdx",
    source: "experiments/rust-backend/tests/pool_lifetime.rs",
    excerpts: [{ fence: 1, label: "quote-revision" }],
  },
  {
    article: "data/blog/rag-rust-postgresql-model-context.mdx",
    source: "experiments/rust-backend/tests/retrieval_contract.rs",
    excerpts: [
      { fence: 0, label: "retrieval-query" },
      { fence: 1, label: "embedding-publication" },
    ],
  },
  {
    article: "data/blog/sqlite-wal-growing-reader-checkpoint.mdx",
    source: "experiments/sql-rust/postgres-sqlite/src/bin/sqlite_checkpoint.rs",
    excerpts: [{ fence: 0, label: "passive-checkpoint" }],
  },
  {
    article: "data/blog/pgvector-filtered-search-too-few-results.mdx",
    source: "experiments/rust-backend/tests/pgvector_filter.rs",
    excerpts: [
      { fence: 0, label: "filtered-vector-definition" },
      { fence: 1, label: "filtered-vector-query" },
      { fence: 2, label: "iterative-vector-scan" },
      { fence: 3, label: "complete-filtered-result" },
    ],
  },
  {
    article: "data/blog/claude-code-ci-automation.mdx",
    source: "experiments/rust-backend/tests/agent_review_evidence.rs",
    excerpts: [
      { fence: 0, label: "review-command" },
      { fence: 1, label: "review-evidence" },
    ],
  },
];

for (const entry of cases) {
  const article = await readFile(entry.article, "utf8");
  const source = await readFile(entry.source, "utf8");
  const fences = [...article.matchAll(/^```rust\n([\s\S]*?)^```/gm)];
  for (const { fence, label } of entry.excerpts) {
    const marker = new RegExp(
      `^[ \\t]*// article:${label}:start\\n([\\s\\S]*?)^[ \\t]*// article:${label}:end`,
      "m"
    );
    const excerpt = source.match(marker)?.[1];
    assert.ok(excerpt, `${entry.source}: missing ${label}`);
    assert.ok(fences[fence], `${entry.article}: missing Rust excerpt ${fence}`);
    assert.equal(
      unindent(fences[fence][1]),
      unindent(excerpt),
      `${entry.article}: ${label} differs from the compiled fixture`
    );
    console.log(`Checked exact article excerpt: ${label}`);
  }
}
