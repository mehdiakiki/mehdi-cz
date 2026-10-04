export type RustAtlasGrowthExperimentStatus = "collecting" | "directional" | "inconclusive";

export interface RustAtlasGrowthCohort {
  slug: string;
  label: string;
  caseIds: string[];
}

export interface RustAtlasGrowthExperiment {
  id: string;
  name: string;
  status: RustAtlasGrowthExperimentStatus;
  startedAt: string;
  minimumWindowDays: number;
  reportingLagDays: number;
  evaluateOnOrAfter: string;
  dimensions: string[];
  hypothesis: string;
  primaryMetric: string;
  supportingMetrics: string[];
  decisionRule: string;
  nextBatchSize: number;
  explorationShare: number;
  cohorts: RustAtlasGrowthCohort[];
}

export const rustAtlasGrowthExperimentStatuses: Record<RustAtlasGrowthExperimentStatus, string>;
export const rustAtlasGrowthExperiments: RustAtlasGrowthExperiment[];
export function getRustAtlasGrowthExperiment(id: string): RustAtlasGrowthExperiment | undefined;
export function getRustAtlasGrowthCohort(caseId: string):
  | {
      experiment: RustAtlasGrowthExperiment;
      cohort: RustAtlasGrowthCohort;
    }
  | undefined;
