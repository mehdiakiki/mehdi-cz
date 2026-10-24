import type { EditorialSeries } from "../data/editorial-series.mjs";
import type { Publishable } from "./publication.mjs";

export function publicArticleHref<T extends Publishable & { slug: string }>(
  posts: T[], slug: string, now?: Date
): string | null;
export function publishedSeriesParts<T extends Publishable & { slug: string }>(
  series: EditorialSeries, posts: T[], now?: Date
): T[];
export function availableEditorialSeries<T extends Publishable & { slug: string }>(
  posts: T[], now?: Date
): EditorialSeries[];
