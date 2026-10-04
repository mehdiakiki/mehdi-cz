/**
 * Return the publication instant for a post.
 *
 * Date-only values are interpreted by JavaScript as midnight UTC. Scheduled
 * posts should use a complete ISO 8601 timestamp with an explicit UTC offset.
 */
export function publicationDate(post) {
  const date = new Date(post.date);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A draft never publishes automatically. A non-draft post becomes public as
 * soon as its frontmatter date is at or before `now`.
 */
export function publicationStatus(post, now = new Date()) {
  if (post.draft !== undefined && typeof post.draft !== "boolean") {
    return "invalid";
  }
  if (post.draft === true) {
    return "draft";
  }

  // Review-gated articles opt into a second explicit lock. Legacy articles can
  // omit this field; campaign audits separately require an explicit value.
  if (post.reviewed !== undefined && typeof post.reviewed !== "boolean") {
    return "invalid";
  }
  if ((post.campaign || post.opportunity) && post.reviewed !== true) {
    return "unapproved";
  }
  if (post.reviewed === false) {
    return "unapproved";
  }

  const date = publicationDate(post);
  if (!date) {
    return "invalid";
  }

  return date.getTime() <= now.getTime() ? "published" : "scheduled";
}

export function isPostPublished(post, now = new Date()) {
  return publicationStatus(post, now) === "published";
}

export function filterPublishedPosts(posts, now = new Date()) {
  return posts.filter((post) => isPostPublished(post, now));
}

/**
 * Draft and scheduled content remains previewable with `yarn dev`, but it is
 * excluded from every production surface.
 */
export function filterVisiblePosts(
  posts,
  { now = new Date(), preview = process.env.NODE_ENV !== "production" } = {}
) {
  return preview ? [...posts] : filterPublishedPosts(posts, now);
}
