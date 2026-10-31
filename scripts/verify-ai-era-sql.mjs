import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { publicationStatus } from "../lib/publication.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/ai-era-sql-2026-10-31/manifest.json", "utf8")
);
const review = JSON.parse(await readFile(manifest.review_record, "utf8"));
assert.equal(review.independent_review_claimed, false);
assert.equal(review.articles.length, manifest.articles.length);

// Ignore Rust formatting outside literals. Preserve SQL and other string bytes.
function tokens(code) {
  return code
    .match(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|[A-Za-z_][A-Za-z_0-9]*|\d+|[^\s]/g)
    .filter((token) => !token.startsWith("//"));
}

for (const article of manifest.articles) {
  const source = await readFile(article.path, "utf8");
  const { data, content } = matter(source);
  const reviewed = review.articles.find((item) => item.slug === article.slug);
  assert.ok(reviewed, `${article.slug}: missing editorial record`);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    reviewed.source_sha256,
    `${article.slug}: editorial record does not cover this exact manuscript`
  );
  assert.equal(data.title, article.title);
  assert.equal(data.draft, true, article.slug);
  assert.equal(data.reviewed, false, article.slug);
  assert.deepEqual(data.authors, ["default"], article.slug);
  assert.equal(publicationStatus(data, new Date("2030-01-01")), "draft", article.slug);
  if (article.kind === "revision") {
    const original = await readFile(article.target);
    assert.equal(
      createHash("sha256").update(original).digest("hex"),
      article.base_source_sha256,
      `${article.slug}: published source changed instead of its review copy`
    );
    assert.ok(article.path.startsWith("docs/editorial/"));
  } else {
    assert.equal(article.kind, "new");
    assert.equal(article.path, `data/blog/${article.slug}.mdx`);
  }
  const fences = [...content.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)];
  assert.equal(fences.length, article.snippets.length, article.slug);
  for (const [index, snippet] of article.snippets.entries()) {
    assert.equal(fences[index][1], "rust", article.slug);
    const fixture = await readFile(snippet.source, "utf8");
    const start = `// article:start ${snippet.label}\n`;
    const end = `// article:end ${snippet.label}`;
    assert.ok(fixture.includes(start) && fixture.includes(end), snippet.label);
    const excerpt = fixture.split(start)[1].split(end)[0];
    assert.deepEqual(tokens(fences[index][2]), tokens(excerpt), `${article.slug}: Rust excerpt`);
  }
  console.log(`Verified held manuscript and exact Rust excerpts: ${article.slug}`);
}
