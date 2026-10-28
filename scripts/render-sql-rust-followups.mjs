import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/sql-rust-followups-2026-10-27.json", "utf8")
);
const output = "/tmp/editorial-evidence/previews/sql-rust-followups";
await mkdir(output, { recursive: true });
const search = await readFile("public/search.json", "utf8");
const feed = await readFile("public/feed.xml", "utf8");
const sitemap = await readFile(".next/server/app/sitemap.xml.body", "utf8");
const h = React.createElement;
const document = (title, body) =>
  `<!doctype html>${renderToStaticMarkup(
    h(
      "html",
      { lang: "en" },
      h(
        "head",
        null,
        h("meta", { charSet: "utf-8" }),
        h("meta", { name: "robots", content: "noindex, nofollow" }),
        h("title", null, title),
        h(
          "style",
          null,
          "body{max-width:76ch;margin:2rem auto;padding:1rem;font:18px/1.65 system-ui}pre{overflow:auto;background:#eee;padding:1rem;font-size:.85em}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:.4rem}h2 svg,h3 svg{width:1em;height:1em}h2 a[aria-hidden],h3 a[aria-hidden]{display:none}"
        )
      ),
      h(
        "body",
        null,
        h("p", null, "Private draft for editorial review. Author: Mehdi Akiki."),
        body
      )
    )
  )}`;
for (const article of manifest.articles) {
  const post = allBlogs.find((item) => item.slug === article.slug);
  assert.ok(post, article.slug);
  assert.equal(publicArticleHref(allBlogs, article.slug), null);
  assert.ok(
    !search.includes(article.slug) &&
      !feed.includes(article.slug) &&
      !sitemap.includes(article.slug),
    article.slug
  );
  await assert.rejects(readFile(`.next/server/app/blog/${article.slug}.html`), { code: "ENOENT" });
  const body = renderToStaticMarkup(h(MDXLayoutRenderer, { code: post.body.code }));
  assert.ok(body.includes("<h2") && body.includes("<pre"), article.slug);
  for (const [, target] of body.matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    assert.ok(
      publicArticleHref(allBlogs, target),
      `${article.slug}: unavailable linked article ${target}`
    );
  }
  await writeFile(
    `${output}/${article.slug}.html`,
    document(
      post.title,
      h(
        React.Fragment,
        null,
        h("h1", null, post.title),
        h("article", { dangerouslySetInnerHTML: { __html: body } })
      )
    )
  );
}
await writeFile(
  `${output}/index.html`,
  document(
    "Rust and database drafts",
    h(
      "ol",
      null,
      ...manifest.articles.map((article) =>
        h("li", { key: article.slug }, h("a", { href: `${article.slug}.html` }, article.title))
      )
    )
  )
);
console.log(
  "Rendered seven private review copies; none has a public route, search entry, feed item or sitemap entry."
);
