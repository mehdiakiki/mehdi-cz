export type ContentClusterSlug =
  | "rust-under-the-hood"
  | "reliable-data-integrations"
  | "reliable-ai-systems";

export type ContentCluster = {
  slug: ContentClusterSlug;
  shortTitle: string;
  title: string;
  subtitle: string;
  description: string;
  featuredSlugs: string[];
  introduction: string[];
  principles: Array<{ title: string; description: string }>;
  questions: string[];
  cta: {
    title: string;
    description: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
};

export const contentClusterSlugs: ContentClusterSlug[];
export const contentClusters: ContentCluster[];
export const authorityCampaign: {
  opportunityTarget: number;
  canonicalPageTarget: number;
  checkpointPageTarget: number;
  yearEnd: string;
  clusters: Record<
    ContentClusterSlug,
    { opportunities: number; canonicalPages: number; checkpointPages: number }
  >;
};

export function isContentClusterSlug(value: unknown): value is ContentClusterSlug;
export function getContentCluster(slug: unknown): ContentCluster | undefined;
