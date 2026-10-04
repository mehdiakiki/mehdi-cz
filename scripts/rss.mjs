import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { slug } from "github-slugger";
import { escape } from "pliny/utils/htmlEscaper.js";
import siteMetadata from "../data/siteMetadata.js";
import tagData from "../app/tag-data.json" with { type: "json" };
import { allBlogs } from "../.contentlayer/generated/index.mjs";
import { sortPosts } from "pliny/utils/contentlayer.js";
import { filterPublishedPosts } from "../lib/publication.mjs";
import { filterNotePosts, filterWritingPosts } from "../lib/content-format.mjs";

const generateRssItem = (config, post) => `
  <item>
    <guid>${config.siteUrl}/blog/${post.slug}</guid>
    <title>${escape(post.title)}</title>
    <link>${config.siteUrl}/blog/${post.slug}</link>
    ${post.summary && `<description>${escape(post.summary)}</description>`}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${post.tags && post.tags.map((t) => `<category>${t}</category>`).join("")}
  </item>
`;

const generateRss = (config, posts, page = "feed.xml") => `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(config.title)}</title>
      <link>${config.siteUrl}/blog</link>
      <description>${escape(config.description)}</description>
      <language>${config.language}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map((post) => generateRssItem(config, post)).join("")}
    </channel>
  </rss>
`;

async function generateRSS(config, allBlogs, page = "feed.xml") {
  const publishPosts = filterPublishedPosts(allBlogs);
  const writingPosts = sortPosts(filterWritingPosts(publishPosts));
  const notePosts = sortPosts(filterNotePosts(publishPosts));
  const tagFeedRoot = path.join("public", "tags");

  // Tag feeds are generated artifacts. Clear them first so removed, drafted,
  // or not-yet-published posts cannot survive in a stale feed from an older build.
  rmSync(tagFeedRoot, { recursive: true, force: true });
  rmSync(path.join("public", "notes.xml"), { force: true });

  // Keep long-form writing and short notes in distinct feeds.
  if (writingPosts.length > 0) {
    const rss = generateRss(config, writingPosts);
    writeFileSync(`./public/${page}`, rss);
  }

  if (notePosts.length > 0) {
    const rss = generateRss(config, notePosts, "notes.xml");
    writeFileSync("./public/notes.xml", rss);
  }

  if (writingPosts.length > 0) {
    for (const tag of Object.keys(tagData)) {
      const filteredPosts = writingPosts.filter((post) =>
        post.tags.map((t) => slug(t)).includes(tag)
      );
      if (filteredPosts.length === 0) continue;

      const rss = generateRss(config, filteredPosts, `tags/${tag}/${page}`);
      const rssPath = path.join(tagFeedRoot, tag);
      mkdirSync(rssPath, { recursive: true });
      writeFileSync(path.join(rssPath, page), rss);
    }
  }
}

const rss = () => {
  generateRSS(siteMetadata, allBlogs);
  console.log("RSS feed generated...");
};
export default rss;
