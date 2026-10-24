import { editorialSeries } from "../data/editorial-series.mjs";
import { isPostPublished } from "./publication.mjs";

export function publicArticleHref(posts, slug, now = new Date()) {
  const post = posts.find((candidate) => candidate.slug === slug);
  return post && isPostPublished(post, now) ? `/blog/${post.slug}` : null;
}

export function publishedSeriesParts(series, posts, now = new Date()) {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  return series.parts
    .map((slug) => bySlug.get(slug))
    .filter((post) => post && isPostPublished(post, now));
}

export function availableEditorialSeries(posts, now = new Date()) {
  return editorialSeries.filter((series) => publishedSeriesParts(series, posts, now).length > 0);
}
