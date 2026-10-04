import { createHash } from "node:crypto";

const releaseMetadataFields = new Set([
  "date",
  "lastmod",
  "draft",
  "reviewed",
  "reviewedHash",
  "campaign",
  "opportunity",
]);

/**
 * Return the exact source material covered by editorial and technical review.
 * Release and workflow metadata is excluded so a reviewed article can move to
 * another slot without pretending its prose, examples, or claims changed.
 */
export function reviewableArticleSource(source) {
  const normalized = source.replace(/\r\n?/g, "\n");
  const frontmatter = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);

  if (!frontmatter) return normalized.trimEnd();

  const reviewableFrontmatter = frontmatter[1]
    .split("\n")
    .filter((line) => {
      const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):/);
      return !field || !releaseMetadataFields.has(field[1]);
    })
    .join("\n");
  const body = normalized.slice(frontmatter[0].length);

  return `---\n${reviewableFrontmatter}\n---\n${body}`.trimEnd();
}

export function articleReviewHash(source) {
  return createHash("sha256").update(reviewableArticleSource(source), "utf8").digest("hex");
}

export function hasValidReviewHash(post) {
  return (
    post.reviewed === true &&
    typeof post.reviewedHash === "string" &&
    /^[a-f0-9]{64}$/.test(post.reviewedHash) &&
    post.reviewedHash === post.sourceHash
  );
}
