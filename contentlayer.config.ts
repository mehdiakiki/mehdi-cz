import { defineDocumentType, ComputedFields, makeSource } from "contentlayer2/source-files";
import { writeFileSync } from "fs";
import readingTime from "reading-time";
import { remark } from "remark";
import { slug } from "github-slugger";
import path from "path";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAlert } from "remark-github-blockquote-alert";
import {
  remarkExtractFrontmatter,
  remarkCodeTitles,
  remarkImgToJsx,
  remarkTocHeadings,
} from "pliny/mdx-plugins/index.js";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeCitation from "rehype-citation";
import rehypePrismPlus from "rehype-prism-plus";
import rehypePresetMinify from "rehype-preset-minify";
import siteMetadata from "./data/siteMetadata";
import { sortPosts } from "pliny/utils/contentlayer.js";
import { filterVisiblePosts } from "./lib/publication.mjs";
import { filterWritingPosts } from "./lib/content-format.mjs";
import { toSearchDocument } from "./lib/search-document.mjs";
import { remarkPromoteFirstContentImage } from "./lib/remark-promote-first-content-image.mjs";
import remarkNormalizeHeadingOrder from "./lib/remark-normalize-heading-order.mjs";

const root = process.cwd();

async function extractNormalizedTocHeadings(markdown: string) {
  const result = await remark()
    .use(remarkNormalizeHeadingOrder)
    .use(remarkTocHeadings)
    .process(markdown);

  return result.data.toc;
}

const icon = fromHtmlIsomorphic(
  `
  <span class="content-header-link">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 linkicon">
  <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
  <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
  </svg>
  </span>
`,
  { fragment: true }
);

const computedFields: ComputedFields = {
  readingTime: { type: "json", resolve: (doc) => readingTime(doc.body.raw) },
  slug: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.replace(/^.+?(\/)/, ""),
  },
  path: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath,
  },
  filePath: {
    type: "string",
    resolve: (doc) => doc._raw.sourceFilePath,
  },
  toc: { type: "json", resolve: (doc) => extractNormalizedTocHeadings(doc.body.raw) },
};

/**
 * Count the occurrences of all tags across blog posts and write to json file
 */
function createTagCount(allBlogs) {
  const tagCount: Record<string, number> = {};
  filterWritingPosts(filterVisiblePosts<any>(allBlogs)).forEach((file) => {
    if (file.tags) {
      file.tags.forEach((tag) => {
        const formattedTag = slug(tag);
        if (formattedTag in tagCount) {
          tagCount[formattedTag] += 1;
        } else {
          tagCount[formattedTag] = 1;
        }
      });
    }
  });
  writeFileSync("./app/tag-data.json", JSON.stringify(tagCount));
}

function createSearchIndex(allBlogs, allRustFailures) {
  if (
    siteMetadata?.search?.provider === "kbar" &&
    siteMetadata.search.kbarConfig.searchDocumentsPath
  ) {
    writeFileSync(
      `public/${path.basename(siteMetadata.search.kbarConfig.searchDocumentsPath)}`,
      JSON.stringify([
        ...sortPosts(filterVisiblePosts<any>(allBlogs)).map(toSearchDocument),
        ...sortPosts(filterVisiblePosts<any>(allRustFailures)).map(toSearchDocument),
      ])
    );
  }
}

export const Blog = defineDocumentType(() => ({
  name: "Blog",
  filePathPattern: "blog/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    date: { type: "date", required: true },
    tags: { type: "list", of: { type: "string" }, default: [] },
    lastmod: { type: "date" },
    draft: { type: "boolean" },
    format: { type: "string", default: "article" },
    reviewed: { type: "boolean" },
    reviewedHash: { type: "string" },
    cluster: { type: "string" },
    campaign: { type: "string" },
    opportunity: { type: "string" },
    summary: { type: "string" },
    images: { type: "json" },
    authors: { type: "list", of: { type: "string" } },
    layout: { type: "string" },
    bibliography: { type: "string" },
    canonicalUrl: { type: "string" },
  },
  computedFields: {
    ...computedFields,
    structuredData: {
      type: "json",
      resolve: (doc) => ({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: doc.title,
        datePublished: doc.date,
        dateModified: doc.lastmod || doc.date,
        description: doc.summary,
        image: doc.images ? doc.images[0] : siteMetadata.socialBanner,
        url: `${siteMetadata.siteUrl}/${doc._raw.flattenedPath}`,
      }),
    },
  },
}));

export const Authors = defineDocumentType(() => ({
  name: "Authors",
  filePathPattern: "authors/**/*.mdx",
  contentType: "mdx",
  fields: {
    name: { type: "string", required: true },
    avatar: { type: "string" },
    occupation: { type: "string" },
    company: { type: "string" },
    email: { type: "string" },
    twitter: { type: "string" },
    linkedin: { type: "string" },
    github: { type: "string" },
    layout: { type: "string" },
    file: { type: "string" },
  },
  computedFields,
}));

export const RustFailure = defineDocumentType(() => ({
  name: "RustFailure",
  filePathPattern: "rust-failures/**/*.mdx",
  contentType: "mdx",
  fields: {
    caseId: { type: "string", required: true },
    title: { type: "string", required: true },
    date: { type: "date", required: true },
    lastmod: { type: "date" },
    draft: { type: "boolean", default: false },
    reviewed: { type: "boolean", required: true },
    reviewedHash: { type: "string", required: true },
    area: { type: "string", required: true },
    symptom: { type: "string", required: true },
    summary: { type: "string", required: true },
    rustVersions: { type: "list", of: { type: "string" }, default: [] },
    targets: { type: "list", of: { type: "string" }, default: [] },
    profiles: { type: "list", of: { type: "string" }, default: [] },
    searchTerms: { type: "list", of: { type: "string" }, default: [] },
    evidence: { type: "list", of: { type: "string" }, default: [] },
    sources: { type: "list", of: { type: "string" }, default: [] },
  },
  computedFields: {
    ...computedFields,
    path: {
      type: "string",
      resolve: (doc) => `rust/failures/${doc._raw.flattenedPath.replace(/^.+?(\/)/, "")}`,
    },
    structuredData: {
      type: "json",
      resolve: (doc) => ({
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: doc.title,
        datePublished: doc.date,
        dateModified: doc.lastmod || doc.date,
        description: doc.summary,
        url: `${siteMetadata.siteUrl}/rust/failures/${doc._raw.flattenedPath.replace(
          /^.+?(\/)/,
          ""
        )}`,
        isPartOf: {
          "@type": "CollectionPage",
          name: "Rust Failure Atlas",
          url: `${siteMetadata.siteUrl}/rust-failure-atlas`,
        },
      }),
    },
  },
}));

export default makeSource({
  contentDirPath: "data",
  documentTypes: [Blog, Authors, RustFailure],
  mdx: {
    cwd: process.cwd(),
    remarkPlugins: [
      remarkExtractFrontmatter,
      remarkGfm,
      remarkNormalizeHeadingOrder,
      remarkCodeTitles,
      remarkMath,
      remarkImgToJsx,
      [
        remarkPromoteFirstContentImage,
        {
          // Only diagrams measured inside the matching initial viewport receive
          // a preload. Native lazy eligibility remains authoritative elsewhere.
          preloadMediaBySrc: {
            "/static/images/system-design-db-control-pane.webp":
              "(min-width: 1280px) and (min-height: 640px)",
            "/static/images/stick-sessions-load-balancer.webp":
              "(min-width: 1280px) and (min-height: 640px)",
          },
        },
      ],
      remarkAlert,
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "prepend",
          headingProperties: {
            className: ["content-header"],
          },
          content: icon,
        },
      ],
      rehypeKatex,
      [rehypeCitation, { path: path.join(root, "data") }],
      [rehypePrismPlus, { defaultLanguage: "js", ignoreMissing: true }],
      rehypePresetMinify,
    ],
  },
  onSuccess: async (importData) => {
    const { allBlogs, allRustFailures } = await importData();
    createTagCount(allBlogs);
    createSearchIndex(allBlogs, allRustFailures);
  },
});
