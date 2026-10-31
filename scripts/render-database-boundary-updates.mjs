import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";
import { publicationStatus } from "../lib/publication.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Render in the existing GitHub workflow");
const release = JSON.parse(
  await readFile("docs/editorial/database-boundary-updates-2026-10-31.json", "utf8")
);
const output = "/tmp/editorial-evidence/previews/database-boundaries";
await mkdir(output, { recursive: true });
const surfaces = await Promise.all(
  ["public/search.json", "public/feed.xml", ".next/server/app/sitemap.xml.body"].map((file) =>
    readFile(file, "utf8")
  )
);
const h = React.createElement;
const records = [];
for (const article of release.articles) {
  const post = allBlogs.find((post) => post.slug === article.slug);
  assert.ok(post, article.slug);
  assert.equal(post.sourceHash, article.reviewedHash);
  const state = publicationStatus(post);
  const published = state === "published";
  for (const surface of surfaces)
    assert.equal(surface.includes(article.slug), published, article.slug);
  if (published) {
    assert.equal(publicArticleHref(allBlogs, article.slug), `/blog/${article.slug}`);
    const route = await readFile(`.next/server/app/blog/${article.slug}.html`, "utf8");
    assert.ok(route.includes(article.renderedMarker), article.slug);
    assert.ok(route.includes(`rel="canonical" href="https://www.mehdi.cz/blog/${article.slug}"`));
    const entities = [
      ...route.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
    ].flatMap((match) => {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [value];
    });
    const metadata = entities.find((entry) => entry["@type"] === "Article");
    assert.ok(metadata, article.slug);
    assert.deepEqual(
      metadata.author.map((author) => author.name),
      ["Mehdi Akiki"]
    );
    assert.equal(Date.parse(metadata.datePublished), Date.parse(article.date));
    assert.equal(Date.parse(metadata.dateModified), Date.parse(article.lastmod));
  } else {
    assert.equal(state, "scheduled");
    assert.equal(publicArticleHref(allBlogs, article.slug), null);
    await assert.rejects(readFile(`.next/server/app/blog/${article.slug}.html`), {
      code: "ENOENT",
    });
  }
  function ArticleLink({ slug, children }) {
    const href = publicArticleHref(allBlogs, slug);
    return h(href ? "a" : React.Fragment, href ? { href } : null, children);
  }
  const body = renderToStaticMarkup(
    h(MDXLayoutRenderer, {
      code: post.body.code,
      components: { ArticleLink },
    })
  );
  assert.ok(body.includes(article.renderedMarker), article.slug);
  assert.ok(body.includes("<pre"), article.slug);
  await writeFile(
    `${output}/${article.slug}.html`,
    "<!doctype html>" +
      renderToStaticMarkup(
        h(
          "html",
          { lang: "en" },
          h(
            "head",
            null,
            h("meta", { charSet: "utf-8" }),
            h("meta", { name: "robots", content: "noindex, nofollow" }),
            h("title", null, article.title),
            h(
              "style",
              null,
              "body{max-width:78ch;margin:2rem auto;padding:1rem;font:18px/1.65 system-ui}pre{overflow:auto;padding:1rem;background:#eee;font-size:.85em}td,th{padding:.5rem;border:1px solid #aaa}"
            )
          ),
          h(
            "body",
            null,
            h("p", null, `Reviewed article copy. Author: Mehdi Akiki. State: ${state}.`),
            h("h1", null, article.title),
            h("article", { dangerouslySetInnerHTML: { __html: body } })
          )
        )
      )
  );
  records.push({ slug: article.slug, state, date: article.date, lastmod: article.lastmod });
}
await writeFile(`${output}/index.json`, JSON.stringify(records, null, 2) + "\n");
console.log("Rendered three reviewed guide copies and checked their public or scheduled state.");
