export type RelatedWritingItem = {
  href: string;
  title: string;
  kind: "investigation" | "article";
};

type RelatablePost = {
  slug: string;
  title: string;
  date: string;
  format?: string | null;
  cluster?: string | null;
  tags?: string[] | null;
};

export function selectRelatedWriting(
  post: RelatablePost,
  candidates: RelatablePost[],
  options?: { limit?: number; subclusterOf?: (slug: string) => string | undefined }
): RelatedWritingItem[];

export function selectAdjacentWriting<T extends { slug: string; format?: string | null }>(
  post: { slug: string; format?: string | null },
  sortedPeers: T[]
): { prev: T | undefined; next: T | undefined };
