import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { rustDiagnosticPaths } from "../data/rust-diagnostic-paths.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const html = await readFile(".next/server/app/rust-failure-atlas.html", "utf8");
assert.ok(html.includes('id="start-with-a-symptom"'));
assert.ok(html.includes('data-umami-event="atlas-feed-open"'));
const records = [];
for (const path of rustDiagnosticPaths) {
  assert.ok(html.includes(`id="diagnose-${path.slug}"`), path.slug);
  assert.ok(html.includes(`data-umami-event-path="${path.slug}"`), path.slug);
  for (const slug of path.articleSlugs) {
    const available = publicArticleHref(allBlogs, slug);
    const linked = html.includes(`href="/blog/${slug}"`);
    assert.equal(linked, Boolean(available), `${path.slug}: article visibility ${slug}`);
  }
  records.push({ slug: path.slug, publishedArticles: path.articleSlugs.filter((slug) => publicArticleHref(allBlogs, slug)) });
}
await writeFile("/tmp/editorial-evidence/atlas-diagnostic-paths.json", JSON.stringify(records, null, 2));
await writeFile("/tmp/editorial-evidence/previews/rust-failure-atlas.html", html);
console.log("Checked five diagnostic paths in production HTML, published destinations, held drafts and the RSS link.");
