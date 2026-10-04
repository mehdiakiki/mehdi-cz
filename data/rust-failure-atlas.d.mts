export type RustFailureAreaSlug =
  | "diagnostics-macros"
  | "cargo-dependencies"
  | "async-runtime"
  | "concurrency-memory"
  | "ffi-targets"
  | "upgrades-compatibility";

export interface RustFailureArea {
  slug: RustFailureAreaSlug;
  label: string;
  description: string;
}

export interface RustFailureAtlasEntry {
  id: `RFA-${string}`;
  area: RustFailureAreaSlug;
  symptom: string;
  likelyCause: string;
  firstCheck: string;
  searchTerms: string[];
  evidence: string[];
  articleSlug?: string;
  caseSlug?: string;
  plannedTitle?: string;
}

export const rustFailureAreas: RustFailureArea[];
export const rustFailureAtlasEntries: RustFailureAtlasEntry[];
export const rustFailureAtlasLaunch: string;
export function isRustFailureAtlasLaunched(now?: Date): boolean;
export function getRustFailureArea(slug: string): RustFailureArea | undefined;
