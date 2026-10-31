import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const release = JSON.parse(
  await readFile("docs/editorial/rust-reference-release-2026-10-31.json", "utf8")
);
for (const page of release.pages) {
  const source = await readFile(page.path, "utf8");
  assert.equal(createHash("sha256").update(source).digest("hex"), page.sourceHash, page.path);
}
const article = release.articles[0];
const source = await readFile(article.path, "utf8");
const { data } = matter(source);
assert.equal(data.reviewedHash, articleReviewHash(source));
assert.equal(data.reviewedHash, article.reviewedHash);
assert.equal(data.date, article.date);
assert.equal(data.lastmod, release.reviewed_at);
assert.deepEqual(data.authors, ["default"]);
assert.equal(publicationStatus(data, new Date(release.reviewed_at)), "published");

const upstream = JSON.parse(
  await readFile("docs/editorial/rust-reference-upstream-2026-10-31.json", "utf8")
);
assert.equal(upstream.pull_requests.length, 5);
for (const pr of upstream.pull_requests) {
  assert.equal(pr.author, "mehdiakiki");
  assert.equal(pr.merged, true);
  assert.ok(pr.merged_at && pr.merge_commit_sha);
}
assert.equal(
  upstream.pull_requests.find((pr) => pr.number === 161698)?.merged_at,
  "2026-10-17T16:49:13Z"
);
console.log("Checked reviewed reference sources, the existing article date, sole author, and upstream status snapshot.");

if (process.argv[2] === "rendered") {
  const { allBlogs } = await import("../.contentlayer/generated/index.mjs");
  const { availableRustDiagnosticPaths } = await import("../data/rust-diagnostic-paths.mjs");
  const hub = await readFile(".next/server/app/rust.html", "utf8");
  for (const path of availableRustDiagnosticPaths(allBlogs, []).slice(0, 3)) {
    assert.ok(hub.includes(`href="${path.links[0].href}"`), path.slug);
    assert.ok(hub.includes(`data-umami-event-path="${path.slug}"`), path.slug);
  }
  const compiler = await readFile(".next/server/app/work/rustc-late-metadata.html", "utf8");
  for (const pr of upstream.pull_requests) {
    assert.ok(compiler.includes(`href="${pr.url}"`), `PR ${pr.number}`);
  }
  assert.ok(compiler.includes('rel="canonical" href="https://www.mehdi.cz/work/rustc-late-metadata"'));
  assert.ok(compiler.includes("Merged October 17, 2026"));
  const route = await readFile(`.next/server/app/blog/${article.slug}.html`, "utf8");
  assert.ok(route.includes('rel="canonical" href="https://www.mehdi.cz/blog/' + article.slug + '"'));
  for (const surface of ["public/search.json", "public/feed.xml", ".next/server/app/sitemap.xml.body"]) {
    assert.ok((await readFile(surface, "utf8")).includes(article.slug), surface);
  }
  await writeFile("/tmp/editorial-evidence/previews/rust-start-here.html", hub);
  await writeFile("/tmp/editorial-evidence/previews/rustc-late-metadata.html", compiler);
  await writeFile("/tmp/editorial-evidence/previews/http-row-stream.html", route);
  console.log("Checked the rendered start paths, compiler links, canonical URLs, and streaming article discovery.");
}
