import { createHash } from "node:crypto";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { articleReviewHash } from "./content-review.mjs";
import { isPostPublished } from "./publication.mjs";

export function guidePaths(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("A guide must have a single, plain article slug");
  }
  return { html: `/blog/${slug}`, markdown: `/blog/${slug}.md` };
}

// Always apply production rules, including in a development or preview build.
export function reviewedGuide(catalog, guide, source, now = new Date()) {
  const paths = guidePaths(guide.slug);
  const { data, content } = matter(source);
  const post = { ...data, slug: guide.slug };
  if (!isPostPublished(post, now) || data.reviewed !== true) return null;
  if (data.reviewedHash !== guide.reviewedHash || data.reviewedHash !== articleReviewHash(source))
    return null;
  if (createHash("sha256").update(source).digest("hex") !== guide.sourceHash) {
    throw new Error(`Refresh the immutable source reference for ${guide.slug}`);
  }
  if (JSON.stringify(data.authors) !== JSON.stringify(["default"])) {
    throw new Error(`Check the author of ${guide.slug}`);
  }
  if (data.canonicalUrl && data.canonicalUrl !== catalog.siteUrl + paths.html) {
    throw new Error(`Check the canonical URL of ${guide.slug}`);
  }
  // These articles use plain Markdown. A future MDX component needs a
  // reviewed text alternative before it can enter this export.
  const inspect = (node) => {
    if (
      node.type === "html" ||
      (node.type === "text" && /[{}]|^\s*(?:import|export)\s/m.test(node.value))
    )
      throw new Error(`Provide a plain Markdown alternative for ${guide.slug}`);
    for (const child of node.children || []) inspect(child);
  };
  inspect(remark().use(remarkGfm).parse(content));
  const entry = {
    slug: guide.slug,
    title: data.title,
    summary: data.summary,
    author: catalog.author,
    publishedAt: data.date,
    updatedAt: data.lastmod || data.date,
    htmlUrl: catalog.siteUrl + paths.html,
    markdownUrl: catalog.siteUrl + paths.markdown,
    question: guide.question,
    useWhen: guide.useWhen,
    checks: guide.checks,
    limitations: guide.limitations,
    testedWith: guide.testedWith,
    evidence: guide.evidence,
    evidenceRun: guide.evidenceRun,
    sourceUrl: guide.sourceUrl,
    reviewedHash: guide.reviewedHash,
    sourceHash: guide.sourceHash,
  };
  const markdown = [
    `# ${entry.title}`,
    "",
    `By ${entry.author}`,
    `Published: ${entry.publishedAt}`,
    `Updated: ${entry.updatedAt}`,
    `Canonical: ${entry.htmlUrl}`,
    `Reviewed source: ${entry.sourceUrl}`,
    "",
    content.trimStart(),
  ].join("\n");
  return { entry, markdown, paths };
}

export function guideIndex(catalog, guides) {
  return {
    version: catalog.version,
    author: catalog.author,
    description:
      "Reviewed Rust and PostgreSQL investigations. Read the evidence and limits before applying a repair.",
    guides: guides.map((guide) => guide.entry),
  };
}

export function llmsText(catalog, guides) {
  return [
    `# ${catalog.author}`,
    "",
    "> Rust and database engineering, explained through concrete failures and working reproductions.",
    "",
    "A selection of Rust database guides. The Markdown links contain the same article text as the canonical HTML pages. The guide index adds questions, checks, tested versions, source links, and limits.",
    "",
    "## Rust and PostgreSQL guides",
    "",
    ...guides.map(({ entry }) => `- [${entry.title}](${entry.markdownUrl}): ${entry.question}`),
    "",
    "## Find more",
    "",
    `- [Find a guide by question](${catalog.siteUrl}/rust/guides): A short introduction to each investigation and a limit to keep in mind.`,
    `- [Guide index](${catalog.siteUrl}/rust/guide-index): Structured metadata for the guides above.`,
    `- [Start with Rust](${catalog.siteUrl}/rust): Reading paths and deeper investigations.`,
    `- [Rust Failure Atlas](${catalog.siteUrl}/rust-failure-atlas): Find related failures by symptom.`,
    `- [Engineering work](${catalog.siteUrl}/work/rustc-late-metadata): The author's Rust compiler work.`,
    "",
  ].join("\n");
}
