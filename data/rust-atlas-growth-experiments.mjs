export const rustAtlasGrowthExperimentStatuses = {
  collecting: "Collecting a complete, equally aged search window",
  directional: "Enough repeated page-level signal to adjust the next batch",
  inconclusive: "Keep the mix because the current evidence does not separate the cohorts",
};

export const rustAtlasGrowthExperiments = [
  {
    id: "RGE-001",
    name: "Compiler diagnostics versus runtime invariants",
    status: "collecting",
    startedAt: "2026-09-05",
    minimumWindowDays: 28,
    reportingLagDays: 3,
    evaluateOnOrAfter: "2026-10-06",
    dimensions: ["page", "query"],
    hypothesis:
      "Exact compiler diagnostics may create faster long-tail search reach, while runtime invariant cases may earn broader queries and more evidence interaction.",
    primaryMetric: "Median non-branded impressions per registered page",
    supportingMetrics: [
      "Pages receiving non-branded impressions",
      "Median non-branded clicks per registered page",
      "Distinct four-or-more-word queries",
      "Impression-weighted average position",
      "Failing and repaired evidence downloads in Umami",
    ],
    decisionRule:
      "Require at least three reached pages in each cohort and 100 non-branded impressions across the experiment. A cohort is only directional when its median impressions per page are at least 25% higher; otherwise keep an even mix.",
    nextBatchSize: 20,
    explorationShare: 0.4,
    cohorts: [
      {
        slug: "compiler-diagnostic",
        label: "Exact compiler diagnostics",
        caseIds: ["RFA-126", "RFA-127", "RFA-128", "RFA-129", "RFA-130"],
      },
      {
        slug: "runtime-invariant",
        label: "Runtime and collection invariants",
        caseIds: ["RFA-131", "RFA-132", "RFA-133", "RFA-134", "RFA-135"],
      },
    ],
  },
];

export function getRustAtlasGrowthExperiment(id) {
  return rustAtlasGrowthExperiments.find((experiment) => experiment.id === id);
}

export function getRustAtlasGrowthCohort(caseId) {
  for (const experiment of rustAtlasGrowthExperiments) {
    const cohort = experiment.cohorts.find((candidate) => candidate.caseIds.includes(caseId));
    if (cohort) return { experiment, cohort };
  }
  return undefined;
}
