import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import { publicationStatus } from "../lib/publication.mjs";
import { markdownWordCount } from "./audit-authority-campaign.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/rust-backend-eight-2026-10-26.json", "utf8")
);
assert.equal(manifest.articles.length, 8);
assert.equal(new Set(manifest.articles.map((a) => a.slug)).size, 8);
function unindent(text) {
  const lines = text.replace(/^\n|\n$/g, "").split("\n");
  const indentation = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length));
  return lines.map((line) => line.slice(indentation)).join("\n").trim();
}
for (const article of manifest.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.draft, true);
  assert.equal(data.reviewed, false);
  assert.equal(publicationStatus({ ...data, reviewed: true }, new Date("2030-01-01")), "draft");
  assert.equal(publicationStatus({ ...data, draft: false }, new Date("2030-01-01")), "unapproved");
  assert.equal(createHash("sha256").update(source).digest("hex"), article.source_sha256);
  assert.ok(markdownWordCount(content) >= 700, article.slug);
  assert.ok(content.includes(`](/blog/${article.primary_parent_slug})`), article.slug);
  const fences = [...content.matchAll(/^```rust\n([\s\S]*?)^```/gm)];
  assert.equal(fences.length, article.snippets.length);
  for (const [index, block] of article.snippets.entries()) {
    const fixture = await readFile(block.source, "utf8");
    const marker = new RegExp(`^[ \\t]*// article:start ${block.label}\\n([\\s\\S]*?)^[ \\t]*// article:end ${block.label}`, "m");
    const code = fixture.match(marker)?.[1];
    assert.ok(code, `${article.slug}: missing ${block.label}`);
    assert.equal(unindent(fences[index][1]), unindent(code), `${article.slug}: excerpt differs from compiled fixture`);
  }
  console.log(`Checked unpublished manuscript and exact Rust excerpts: ${article.slug}`);
}
