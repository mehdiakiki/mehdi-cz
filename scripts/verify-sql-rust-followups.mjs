import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { publicationStatus } from "../lib/publication.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/sql-rust-followups-2026-10-27.json", "utf8")
);
assert.equal(manifest.articles.length, 5);
for (const article of manifest.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  assert.equal(data.title, article.title);
  assert.equal(data.draft, true);
  assert.equal(data.reviewed, false);
  assert.deepEqual(data.authors, ["default"]);
  assert.equal(publicationStatus(data, new Date("2099-01-01")), "draft");
  assert.ok(!source.includes("{{snippet:"), article.slug);
  const fences = [...content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
  assert.equal(fences.length, article.snippets.length, article.slug);
  for (const [index, snippet] of article.snippets.entries()) {
    assert.equal(fences[index][1], "rust");
    const fixture = await readFile(snippet.source, "utf8");
    const marker = new RegExp(
      `^[ \\t]*// article:start ${snippet.label}\\n([\\s\\S]*?)^[ \\t]*// article:end ${snippet.label}`,
      "m"
    );
    const excerpt = fixture.match(marker)?.[1];
    assert.ok(excerpt, snippet.label);
    // Markdown and rustfmt wrap long expressions differently.
    assert.equal(fences[index][2].replace(/\s/g, ""), excerpt.replace(/\s/g, ""), article.slug);
  }
  console.log(`Verified held draft, author and Rust excerpts: ${article.slug}`);
}
