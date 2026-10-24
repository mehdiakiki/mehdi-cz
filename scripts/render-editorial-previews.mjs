// Run in GitHub CI after the production build; output is a private review artifact.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { editorialSeries } from "../data/editorial-series.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";

const output = "/tmp/editorial-evidence/previews";
const now = new Date();
const bySlug = new Map(allBlogs.map((post) => [post.slug, post]));
const records = [];
await mkdir(output, { recursive: true });

for (const series of editorialSeries) {
  for (const slug of series.parts) {
    const post = bySlug.get(slug);
    assert.ok(post, `Missing compiled article: ${slug}`);
    assert.equal(post.draft, true, `Review preview must remain a draft: ${slug}`);
    assert.equal(post.reviewed, false, `Review preview must remain unapproved: ${slug}`);
    assert.equal(publicArticleHref(allBlogs, slug, now), null);
    const contextualLinks = [];
    function ArticleLink({ slug: target, children }) {
      assert.ok(bySlug.has(target), `${slug} references unknown article ${target}`);
      const href = publicArticleHref(allBlogs, target, now);
      contextualLinks.push({ target, href });
      return React.createElement(href ? "a" : React.Fragment, href ? { href } : null, children);
    }
    const body = renderToStaticMarkup(
      React.createElement(MDXLayoutRenderer, { code: post.body.code, components: { ArticleLink } })
    );
    assert.ok(body.includes("<h2"), `Expected article sections: ${slug}`);
    for (const [, href] of body.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href.replaceAll("&amp;", "&"), "https://www.mehdi.cz");
      if (!["www.mehdi.cz", "mehdi.cz"].includes(url.hostname)) continue;
      const match = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
      if (!match) continue;
      const target = decodeURIComponent(match[1]);
      assert.ok(
        publicArticleHref(allBlogs, target, now),
        `${slug} renders an unavailable blog link: ${href}`
      );
    }
    const html =
      "<!doctype html>" +
      renderToStaticMarkup(
        React.createElement(
          "html",
          { lang: "en" },
          React.createElement(
            "head",
            null,
            React.createElement("meta", { charSet: "utf-8" }),
            React.createElement("title", null, post.title),
            React.createElement("meta", { name: "robots", content: "noindex, nofollow" })
          ),
          React.createElement(
            "body",
            null,
            React.createElement("p", null, "Held editorial draft — review artifact only."),
            React.createElement("h1", null, post.title),
            React.createElement("article", { dangerouslySetInnerHTML: { __html: body } })
          )
        )
      );
    await writeFile(path.join(output, `${slug}.html`), html);
    records.push({
      slug,
      title: post.title,
      date: post.date,
      draft: post.draft,
      reviewed: post.reviewed,
      contextualLinks,
    });
  }
}
assert.equal(records.length, 30);
await writeFile(
  path.join(output, "index.json"),
  JSON.stringify({ generatedAt: now.toISOString(), articles: records }, null, 2) + "\n"
);
console.log(`Rendered ${records.length} held drafts and verified their article link destinations.`);
