export interface RustFailureTrail {
  slug: string;
  label: string;
  caseIds: Array<`RFA-${string}`>;
}

export const rustFailureTrails: RustFailureTrail[];
export function getRustFailureTrails(caseId: string): RustFailureTrail[];
export function getRelatedRustFailureIds(caseId: string, limit?: number): Array<`RFA-${string}`>;
