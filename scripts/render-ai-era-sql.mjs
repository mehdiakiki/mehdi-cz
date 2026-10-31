import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import { bundleMDX } from "mdx-bundler";
import remarkGfm from "remark-gfm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Render through the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/ai-era-sql-2026-10-31/manifest.json", "utf8")
);
const output = "/tmp/editorial-evidence/previews/ai-era-sql";
await mkdir(output, { recursive: true });
const surfaces = await Promise.all(
  ["public/search.json", "public/feed.xml", ".next/server/app/sitemap.xml.body"].map((file) =>
    readFile(file, "utf8")
  )
);
const records = [];
const h = React.createElement;
function document(title, body) {
  return "<!doctype html>" + renderToStaticMarkup(
    h("html", { lang: "en" },
      h("head", null,
        h("meta", { charSet: "utf-8" }),
        h("meta", { name: "robots", content: "noindex, nofollow" }),
        h("title", null, title),
        h("style", null, "body{max-width:78ch;margin:2rem auto;padding:1rem;font:18px/1.65 system-ui}pre{overflow:auto;padding:1rem;background:#eee;font-size:.85em}table{border-collapse:collapse}td,th{padding:.5rem;border:1px solid #aaa}")),
      h("body", null,
        h("p", null, "Draft for review. Author: Mehdi Akiki. Publication is pending editorial review."),
        body)));
}
for (const article of manifest.articles) {
  const { content } = matter(await readFile(article.path, "utf8"));
  let code;
  if (article.kind === "new") {
    const post = allBlogs.find((post) => post.slug === article.slug);
    assert.ok(post, article.slug);
    assert.equal(post.draft, true);
    assert.equal(post.reviewed, false);
    assert.equal(publicArticleHref(allBlogs, article.slug), null);
    for (const surface of surfaces) assert.ok(!surface.includes(article.slug), article.slug);
    await assert.rejects(readFile(`.next/server/app/blog/${article.slug}.html`), { code: "ENOENT" });
    code = post.body.code;
  } else {
    ({ code } = await bundleMDX({
      source: content,
      cwd: process.cwd(),
      mdxOptions(options) {
        options.remarkPlugins = [...(options.remarkPlugins || []), remarkGfm];
        return options;
      },
    }));
    assert.ok(publicArticleHref(allBlogs, article.slug), article.slug);
  }
  const body = renderToStaticMarkup(h(MDXLayoutRenderer, { code }));
  assert.ok(body.includes("<h2") && body.includes("<pre"), article.slug);
  for (const [, target] of body.matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    assert.ok(publicArticleHref(allBlogs, target), `${article.slug}: unavailable related article`);
  }
  await writeFile(`${output}/${article.slug}.html`, document(article.title,
    h(React.Fragment, null,
      h("h1", null, article.title),
      h("article", { dangerouslySetInnerHTML: { __html: body } }))));
  records.push({ slug: article.slug, kind: article.kind, title: article.title });
}
await writeFile(`${output}/index.html`, document("Rust and AI: five review manuscripts",
  h("ol", null, ...records.map((article) => h("li", { key: article.slug },
    h("a", { href: `${article.slug}.html` }, article.title), ` (${article.kind})`)))));
await writeFile(`${output}/index.json`, JSON.stringify({ articles: records, publicNewArticles: 0 }, null, 2));
console.log("Rendered five private manuscripts; new drafts have no route, search, RSS or sitemap entry.");
