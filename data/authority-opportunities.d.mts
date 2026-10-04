import type { ContentClusterSlug } from "./content-clusters.mjs";

export type AuthorityOpportunity = {
  id: string;
  cluster: ContentClusterSlug;
  subcluster: string;
  workingTitle: string;
  evidencePlan: string;
  stage: "brief" | "draft" | "upgrade";
  slug: string;
  validation: "pending" | "validated" | "rejected";
  publishDecision: "hold" | "approved" | "merge" | "kill";
  canonicalSources?: string[];
};

export const rustOpportunities: AuthorityOpportunity[];
export const dataOpportunities: AuthorityOpportunity[];
export const aiOpportunities: AuthorityOpportunity[];
export const authorityOpportunities: AuthorityOpportunity[];
