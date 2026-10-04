import type { RustFailureEvidenceCase } from "./rust-failure-evidence.mjs";

export type RustFailureRunnerId = NonNullable<RustFailureEvidenceCase["runner"]>;

export interface RustFailureRunner {
  label: string;
  method: string;
}

export interface RustFailureFeaturedLayer {
  slug: string;
  label: string;
  description: string;
  caseIds: Array<`RFA-${string}`>;
}

export type RustFailureTier = "featured" | "reference";

export const rustFailureRunners: Record<RustFailureRunnerId, RustFailureRunner>;
export const rustFailureSystemsRunners: RustFailureRunnerId[];
export const rustFailureCuratedSystemsCases: Record<`RFA-${string}`, string>;
export const rustFailureFeaturedLayers: RustFailureFeaturedLayer[];
export function getRustFailureRunner(
  caseId: string
): (RustFailureRunner & { id: RustFailureRunnerId }) | undefined;
export function isRustFailureSystemsCase(caseId: string): boolean;
export function getRustFailureTier(caseId: string): RustFailureTier;
export function isRustFailureErrorCodeCase(caseId: string): boolean;
export function getRustFailureFeatureNote(caseId: string): string | undefined;
export function getRustFailureFeaturedPreviewIds(count: number): Array<`RFA-${string}`>;
