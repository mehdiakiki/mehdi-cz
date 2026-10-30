// Run in GitHub CI after the production build; output is a private review artifact.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const sqlSeries = JSON.parse(
  await readFile("docs/editorial/sql-rust-proposed-series-2026-10-25.json", "utf8")
);
const backendSeries = JSON.parse(
  await readFile("docs/editorial/rust-backend-eight-2026-10-26.json", "utf8")
);
const followups = JSON.parse(
  await readFile("docs/editorial/sql-rust-followups-2026-10-27.json", "utf8")
);
const practicalRelease = JSON.parse(
  await readFile("docs/editorial/practical-advice-50-release-2026-10-30.json", "utf8")
);
const reviewSeries = editorialSeries;
await mkdir(output, { recursive: true });

for (const series of reviewSeries) {
  for (const slug of series.parts) {
    const post = bySlug.get(slug);
    assert.ok(post, `Missing compiled article: ${slug}`);
    if (post.draft === true || post.reviewed === false) {
      assert.equal(publicArticleHref(allBlogs, slug, now), null);
      await assert.rejects(readFile(`.next/server/app/blog/${slug}.html`, "utf8"), {
        code: "ENOENT",
      });
    }
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
            React.createElement("meta", { name: "robots", content: "noindex, nofollow" }),
            React.createElement(
              "style",
              null,
              "body{max-width:74ch;margin:2rem auto;padding:0 1rem;font:18px/1.65 system-ui}pre{overflow:auto;padding:1rem;background:#f3f4f6;font-size:.85em}h1,h2,h3{line-height:1.2}a{color:#174ea6}"
            )
          ),
          React.createElement(
            "body",
            null,
            React.createElement("p", null, "Editorial review copy; state is in index.json."),
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
assert.equal(
  records.length,
  30 +
    sqlSeries.articles.length +
    backendSeries.articles.length +
    followups.articles.length +
    practicalRelease.articles.length
);
await writeFile(
  path.join(output, "index.json"),
  JSON.stringify({ generatedAt: now.toISOString(), articles: records }, null, 2) + "\n"
);
await writeFile(
  path.join(output, "sql-rust-index.html"),
  "<!doctype html>" +
    renderToStaticMarkup(
      React.createElement(
        "html",
        { lang: "en" },
        React.createElement(
          "head",
          null,
          React.createElement("meta", { charSet: "utf-8" }),
          React.createElement("meta", { name: "robots", content: "noindex, nofollow" }),
          React.createElement("title", null, "SQL and Rust: thirty published articles")
        ),
        React.createElement(
          "body",
          null,
          React.createElement("h1", null, "SQL and Rust: thirty published articles"),
          React.createElement(
            "p",
            null,
            "Private review copies of the thirty articles approved for immediate publication."
          ),
          React.createElement(
            "ol",
            null,
            ...sqlSeries.articles.map((article) =>
              React.createElement(
                "li",
                { key: article.slug },
                React.createElement("a", { href: `${article.slug}.html` }, article.title),
                ` (${article.database})`
              )
            )
          )
        )
      )
    )
);
// Exercise the changed metadata on an actual production article, not the
// standalone MDX copies above. This existing route is also a build regression target.
const articleUrl = "https://www.mehdi.cz/blog/BufReader-rust";
const productionHtml = await readFile(".next/server/app/blog/BufReader-rust.html", "utf8");
const canonicalPattern = /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g;
const canonicals = [...productionHtml.matchAll(canonicalPattern)].map((match) => match[1]);
assert.deepEqual(canonicals, [articleUrl]);
const schemaPattern = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
const schemas = [...productionHtml.matchAll(schemaPattern)].flatMap((match) => {
  const value = JSON.parse(match[1]);
  return Array.isArray(value) ? value : [value];
});
const articleSchemas = schemas.filter((value) => value["@type"] === "Article");
assert.equal(articleSchemas.length, 1, "A production article must emit one Article entity");
assert.equal(articleSchemas[0].url, articleUrl);
assert.equal(articleSchemas[0]["@id"], `${articleUrl}#article`);
assert.ok(articleSchemas[0].author.length > 0);
const sqlHubHtml = await readFile(
  ".next/server/app/blog/series/sql-databases-from-rust.html",
  "utf8"
);
const blogIndexHtml = await readFile(".next/server/app/blog.html", "utf8");
assert.ok(blogIndexHtml.includes('href="/blog/series/sql-databases-from-rust"'));
for (const article of sqlSeries.articles) {
  const post = bySlug.get(article.slug);
  const url = `https://www.mehdi.cz/blog/${article.slug}`;
  const html = await readFile(`.next/server/app/blog/${article.slug}.html`, "utf8");
  assert.ok(sqlHubHtml.includes(`href="/blog/${article.slug}"`), article.slug);
  assert.ok(publicArticleHref(allBlogs, article.slug, now), article.slug);
  assert.doesNotMatch(html, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i, article.slug);
  assert.deepEqual(
    [...html.matchAll(canonicalPattern)].map((match) => match[1]),
    [url]
  );
  const entities = [...html.matchAll(schemaPattern)]
    .flatMap((match) => {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [value];
    })
    .filter((value) => value["@type"] === "Article");
  assert.equal(entities.length, 1, article.slug);
  assert.equal(entities[0].headline, post.title);
  assert.equal(entities[0].description, post.summary);
  assert.equal(entities[0].url, url);
  assert.equal(Date.parse(entities[0].datePublished), Date.parse(post.date));
  assert.equal(Date.parse(entities[0].dateModified), Date.parse(post.lastmod));
}
console.log(
  `Rendered ${records.length} series review copies, checked article links, and verified all thirty released SQL pages, their hub, canonical URLs and Article metadata.`
);
