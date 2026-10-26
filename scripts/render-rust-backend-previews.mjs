// Run only in GitHub CI after the production build. Draft HTML stays in an artifact.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Render through the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/rust-backend-eight-2026-10-26.json", "utf8")
);
const bySlug = new Map(allBlogs.map((post) => [post.slug, post]));
const output = "/tmp/editorial-evidence/previews/rust-backend";
const search = await readFile("public/search.json", "utf8");
await mkdir(output, { recursive: true });
const element = React.createElement;
const records = [];

function document(title, content) {
  return (
    "<!doctype html>" +
    renderToStaticMarkup(
      element(
        "html",
        { lang: "en" },
        element(
          "head",
          null,
          element("meta", { charSet: "utf-8" }),
          element("meta", { name: "robots", content: "noindex, nofollow" }),
          element("title", null, title),
          element(
            "style",
            null,
            "body{max-width:74ch;margin:2rem auto;padding:0 1rem;font:18px/1.65 system-ui}pre{overflow:auto;padding:1rem;background:#eee;font-size:.85em}a{color:#174ea6}table{border-collapse:collapse}td,th{padding:.4rem;border:1px solid #ccc}"
          )
        ),
        element(
          "body",
          null,
          element("p", null, "Private first draft; not approved for publication."),
          content
        )
      )
    )
  );
}

for (const article of manifest.articles) {
  const post = bySlug.get(article.slug);
  assert.ok(post, `Missing compiled draft: ${article.slug}`);
  assert.equal(post.draft, true);
  assert.equal(post.reviewed, false);
  assert.equal(publicArticleHref(allBlogs, article.slug), null);
  assert.ok(!search.includes(article.slug), `Draft leaked into public search: ${article.slug}`);
  await assert.rejects(readFile(`.next/server/app/blog/${article.slug}.html`), { code: "ENOENT" });
  const body = renderToStaticMarkup(element(MDXLayoutRenderer, { code: post.body.code }));
  assert.ok(body.includes("<h2"), article.slug);
  for (const [, target] of body.matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    assert.ok(publicArticleHref(allBlogs, target), `${article.slug}: unavailable parent ${target}`);
  }
  const content = element(
    React.Fragment,
    null,
    element("a", { href: "index.html" }, "All eight drafts"),
    element("h1", null, post.title),
    element("article", { dangerouslySetInnerHTML: { __html: body } })
  );
  await writeFile(`${output}/${article.slug}.html`, document(post.title, content));
  records.push({
    number: article.number,
    slug: article.slug,
    title: post.title,
    group: article.group,
  });
}

assert.equal(records.length, 8);
const index = element(
  React.Fragment,
  null,
  element("h1", null, "Rust backend problems: eight unpublished drafts"),
  element(
    "ol",
    null,
    ...records.map((record) => element(
      "li", { key: record.slug },
      element("a", { href: `${record.slug}.html` }, record.title)
    ))
  )
);
await writeFile(`${output}/index.html`, document(manifest.series_name, index));
await writeFile(
  `${output}/index.json`,
  JSON.stringify({ articles: records, publicRoutes: 0 }, null, 2)
);
console.log(
  `Rendered ${records.length} private drafts; none has a production route or public search entry.`
);
