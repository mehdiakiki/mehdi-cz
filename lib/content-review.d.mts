export type ReviewablePost = {
  reviewed?: boolean;
  reviewedHash?: string;
  sourceHash?: string;
};

export function reviewableArticleSource(source: string): string;
export function articleReviewHash(source: string): string;
export function hasValidReviewHash(post: ReviewablePost): boolean;
