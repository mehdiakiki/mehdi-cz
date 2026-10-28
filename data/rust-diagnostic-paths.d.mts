import type { Publishable } from "../lib/publication.mjs";

export interface RustDiagnosticPath {
  slug: string;
  title: string;
  firstCheck: string;
  caseIds: string[];
  articleSlugs: string[];
}
export interface AvailableRustDiagnosticPath {
  slug: string;
  title: string;
  firstCheck: string;
  links: { href: string; label: string; kind: "article" | "case" }[];
}
export const rustDiagnosticPaths: RustDiagnosticPath[];
export function availableRustDiagnosticPaths(
  posts: (Publishable & { slug: string; title: string })[],
  entries: {
    id: string;
    destinationAvailable: boolean;
    isPreview: boolean;
    destinationPath: string;
    destinationTitle: string;
  }[],
  now?: Date
): AvailableRustDiagnosticPath[];
