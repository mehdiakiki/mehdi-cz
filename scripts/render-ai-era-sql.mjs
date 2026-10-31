import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { publicArticleHref } from "../lib/editorial-navigation.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { writingThemeOf } from "../data/writing-tiers.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Render through the existing GitHub workflow");
const manifest = JSON.parse(
  await readFile("docs/editorial/ai-era-sql-2026-10-31/manifest.json", "utf8")
);
const release = JSON.parse(await readFile(manifest.release_record, "utf8"));
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
  return (
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
          h("title", null, title),
          h(
            "style",
            null,
            "body{max-width:78ch;margin:2rem auto;padding:1rem;font:18px/1.65 system-ui}pre{overflow:auto;padding:1rem;background:#eee;font-size:.85em}table{border-collapse:collapse}td,th{padding:.5rem;border:1px solid #aaa}"
          )
        ),
        h(
          "body",
          null,
          h(
            "p",
            null,
            "Reviewed article copy. Author: Mehdi Akiki. Publication state is recorded in index.json."
          ),
          body
        )
      )
    )
  );
}
for (const article of manifest.articles) {
  const edition = release.articles.find((item) => item.slug === article.slug);
  const { data } = matter(await readFile(edition.path, "utf8"));
  const post = allBlogs.find((post) => post.slug === article.slug);
  assert.ok(post, article.slug);
  assert.equal(post.draft, false);
  assert.equal(post.reviewed, true);
  const state = publicationStatus({ ...data, slug: article.slug });
  const published = state === "published";
  if (published) {
    assert.equal(publicArticleHref(allBlogs, article.slug), `/blog/${article.slug}`);
    for (const surface of surfaces) assert.ok(surface.includes(article.slug), article.slug);
    const route = await readFile(`.next/server/app/blog/${article.slug}.html`, "utf8");
    assert.ok(route.includes(edition.rendered_marker), article.slug);
    assert.ok(route.includes(`rel="canonical" href="https://www.mehdi.cz/blog/${article.slug}"`));
    const entities = [
      ...route.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
    ].flatMap((match) => {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [value];
    });
    const metadata = entities.find((value) => ["Article", "BlogPosting"].includes(value["@type"]));
    assert.ok(metadata, article.slug);
    const authors = Array.isArray(metadata.author) ? metadata.author : [metadata.author];
    assert.deepEqual(
      authors.map((author) => (typeof author === "string" ? author : author.name)),
      ["Mehdi Akiki"]
    );
    assert.equal(Date.parse(metadata.datePublished), Date.parse(edition.date));
    assert.equal(Date.parse(metadata.dateModified), Date.parse(edition.lastmod));
  } else {
    assert.equal(state, "scheduled", article.slug);
    assert.equal(publicArticleHref(allBlogs, article.slug), null);
    for (const surface of surfaces) assert.ok(!surface.includes(article.slug), article.slug);
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
  assert.ok(body.includes("<h2") && body.includes("<pre"), article.slug);
  assert.ok(body.includes(edition.rendered_marker), article.slug);
  for (const [, target] of body.matchAll(/href="\/blog\/([^"#?]+)"/g)) {
    assert.ok(publicArticleHref(allBlogs, target), `${article.slug}: unavailable related article`);
  }
  await writeFile(
    `${output}/${article.slug}.html`,
    document(
      article.title,
      h(
        React.Fragment,
        null,
        h("h1", null, article.title),
        h("article", { dangerouslySetInnerHTML: { __html: body } })
      )
    )
  );
  if (article.kind === "new") {
    const href = `href="/blog/${article.slug}"`;
    for (const path of [
      ".next/server/app/blog/topics/reliable-ai-systems.html",
      `.next/server/app/blog/themes/${writingThemeOf(article.slug)}.html`,
      `.next/server/app/blog/series/${edition.series}.html`,
    ]) {
      assert.equal((await readFile(path, "utf8")).includes(href), published, path);
    }
  }
  records.push({ slug: article.slug, kind: article.kind, title: article.title, state });
}
await writeFile(
  `${output}/index.html`,
  document(
    "Rust and AI: five reviewed articles",
    h(
      "ol",
      null,
      ...records.map((article) =>
        h(
          "li",
          { key: article.slug },
          h("a", { href: `${article.slug}.html` }, article.title),
          ` (${article.kind})`
        )
      )
    )
  )
);
await writeFile(
  `${output}/index.json`,
  JSON.stringify(
    {
      articles: records,
      publicNewArticles: records.filter(
        (article) => article.kind === "new" && article.state === "published"
      ).length,
    },
    null,
    2
  )
);
console.log(
  "Verified public editions, canonical URLs, sole-author metadata, daily release gates and the reading paths; retained five HTML copies."
);
