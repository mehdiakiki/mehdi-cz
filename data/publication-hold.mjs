/**
 * Scheduled article publishing resumed on 2026-10-10 after the editorial hold
 * introduced on 2026-10-04. Reviewed articles follow their existing publication
 * dates again. Add a slug here only when an individual article needs a hold.
 */
export const heldArticleSlugs = new Set();

/**
 * Upgrade deadlines remain paused while existing articles are revised.
 * This does not pause scheduled publication of new articles.
 */
export const campaignUpgradeDeadlinesPaused = true;
