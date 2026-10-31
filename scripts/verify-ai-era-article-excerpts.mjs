import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");

function unindent(text) {
  const lines = text.trimEnd().replace(/^\n/, "").split("\n");
  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length)
  );
  return lines.map((line) => line.slice(indentation)).join("\n");
}

const cases = [
  {
    article: "data/blog/database-pool-full-check-connection-lifetime.mdx",
    source: "experiments/rust-backend/tests/pool_lifetime.rs",
    excerpts: [{ fence: 2, label: "quote-revision" }],
  },
  {
    article: "data/blog/rag-rust-postgresql-model-context.mdx",
    source: "experiments/rust-backend/tests/retrieval_contract.rs",
    excerpts: [
      { fence: 0, label: "retrieval-query" },
      { fence: 1, label: "embedding-publication" },
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
