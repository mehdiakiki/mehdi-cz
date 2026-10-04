import type { AuthorityOpportunity } from "./authority-opportunities.mjs";
import type { RustFailureAreaSlug } from "./rust-failure-atlas.mjs";

export type RustSystemsAtlasSectionSlug =
  | "diagnostic-failures"
  | "compiler-internals"
  | "cargo-build-linking"
  | "async-concurrency"
  | "types-memory-unsafe"
  | "ffi-targets"
  | "release-compatibility";

export interface RustSystemsAtlasSection {
  slug: RustSystemsAtlasSectionSlug;
  title: string;
  shortTitle: string;
  targetPages: number;
  description: string;
  questions: string[];
  href: string;
  failureArea?: RustFailureAreaSlug;
}

export const rustSystemsAtlasGoal: {
  canonicalPages: number;
  evidenceArtifacts: number;
  failurePagesAtMilestone: number;
  description: string;
};
export const rustSystemsAtlasEditorialSections: Record<string, RustSystemsAtlasSectionSlug>;
export const rustSystemsAtlasSections: RustSystemsAtlasSection[];
export const rustSystemsAtlasAxes: string[];
export function rustAtlasSectionForOpportunity(
  opportunity: AuthorityOpportunity
): RustSystemsAtlasSectionSlug;
export function rustAtlasSectionForEditorialArticle(
  slug: string
): RustSystemsAtlasSectionSlug | undefined;
export function getRustSystemsAtlasSection(slug: string): RustSystemsAtlasSection | undefined;
