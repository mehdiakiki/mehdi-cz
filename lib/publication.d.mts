export type Publishable = {
  date: string;
  slug?: string | null;
  draft?: boolean | null;
  reviewed?: boolean | null;
  campaign?: string | null;
  opportunity?: string | null;
};

export type PublicationStatus =
  | "draft"
  | "held"
  | "unapproved"
  | "invalid"
  | "published"
  | "scheduled";

export function publicationDate(post: Publishable): Date | null;
export function publicationStatus(post: Publishable, now?: Date): PublicationStatus;
export function isPostPublished(post: Publishable, now?: Date): boolean;
export function filterPublishedPosts<T extends Publishable>(posts: T[], now?: Date): T[];
export function filterVisiblePosts<T extends Publishable>(
  posts: T[],
  options?: { now?: Date; preview?: boolean }
): T[];
