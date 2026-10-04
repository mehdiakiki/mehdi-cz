import "server-only";

import { allBlogs, allRustFailures, type Blog, type RustFailure } from "contentlayer/generated";

import type {
  RustFailureExplorerEntry,
  RustFailureExplorerWirePayload,
} from "@/components/RustFailureAtlasExplorer";
import { getRustFailureArea, rustFailureAtlasEntries } from "@/data/rust-failure-atlas.mjs";
import { getRustFailureEvidence } from "@/data/rust-failure-evidence.mjs";
import { isCanonicalRustFailureCase } from "@/data/rust-failure-intent-review.mjs";
import { filterVisiblePosts, publicationStatus } from "lib/publication.mjs";

export function getVisibleRustFailureEntries(): RustFailureExplorerEntry[] {
  const visiblePosts = filterVisiblePosts<Blog>(allBlogs);
  const visiblePostSlugs = new Set(visiblePosts.map((post) => post.slug));
  const postsBySlug = new Map(allBlogs.map((post) => [post.slug, post]));
  const visibleCases = filterVisiblePosts<RustFailure>(allRustFailures);
  const visibleCaseSlugs = new Set(visibleCases.map((failure) => failure.slug));
  const casesBySlug = new Map(allRustFailures.map((failure) => [failure.slug, failure]));

  return rustFailureAtlasEntries
    .filter((entry) => isCanonicalRustFailureCase(entry.id))
    .flatMap((entry) => {
      const failureArea = getRustFailureArea(entry.area);
      if (!failureArea) return [];

      const post = entry.articleSlug ? postsBySlug.get(entry.articleSlug) : undefined;
      const failure = entry.caseSlug ? casesBySlug.get(entry.caseSlug) : undefined;
      const destination = post || failure;
      const destinationTitle = destination?.title || entry.plannedTitle;
      if (!destinationTitle) return [];

      const destinationAvailable = post
        ? visiblePostSlugs.has(post.slug)
        : failure
          ? visibleCaseSlugs.has(failure.slug)
          : false;
      if (destination && !destinationAvailable) return [];

      return [
        {
          id: entry.id,
          area: entry.area,
          areaLabel: failureArea.label,
          symptom: entry.symptom,
          likelyCause: entry.likelyCause,
          firstCheck: entry.firstCheck,
          searchTerms: entry.searchTerms,
          evidence: entry.evidence,
          hasExecutableFixture: Boolean(getRustFailureEvidence(entry.id)),
          destinationPath: post
            ? `/blog/${post.slug}`
            : failure
              ? `/rust/failures/${failure.slug}`
              : `/rust-failure-atlas/area/${entry.area}#${entry.id.toLocaleLowerCase("en")}`,
          destinationTitle,
          destinationAvailable,
          isPreview:
            Boolean(destination) &&
            destinationAvailable &&
            publicationStatus(destination!) !== "published",
        },
      ];
    });
}

export function getRustFailureSearchIndex(): RustFailureExplorerWirePayload {
  return {
    version: 1,
    entries: getVisibleRustFailureEntries().map((entry) => [
      entry.id,
      entry.area,
      entry.symptom,
      entry.likelyCause,
      entry.firstCheck,
      entry.searchTerms,
      entry.evidence,
      entry.destinationPath,
      entry.destinationTitle,
      entry.destinationAvailable,
      entry.isPreview,
      entry.hasExecutableFixture,
    ]),
  };
}
