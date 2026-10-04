const supportedBudgets = new Set([25, 100, 250]);

/**
 * Return the per-family server prerender ceiling, or null for exhaustive builds.
 * Static exports intentionally ignore the experiment budget.
 */
export function configuredPrerenderBudget(environment = process.env) {
  if (environment.EXPORT) return null;

  const rawBudget = environment.PRERENDER_BUDGET;
  if (rawBudget === undefined || rawBudget === "") return null;
  if (!/^\d+$/.test(rawBudget)) {
    throw new Error("PRERENDER_BUDGET must be one of 25, 100, or 250");
  }

  const budget = Number(rawBudget);
  if (!supportedBudgets.has(budget)) {
    throw new Error("PRERENDER_BUDGET must be one of 25, 100, or 250");
  }
  return budget;
}

function compareSlugs(left, right) {
  if (left.slug < right.slug) return -1;
  if (left.slug > right.slug) return 1;
  return 0;
}

/**
 * Use recency as the deterministic experiment proxy for route popularity.
 */
export function comparePrerenderPriority(left, right) {
  const leftTime = Date.parse(left.date);
  const rightTime = Date.parse(right.date);
  const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.NEGATIVE_INFINITY;
  const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.NEGATIVE_INFINITY;

  return safeRightTime - safeLeftTime || compareSlugs(left, right);
}

export function selectPrerenderEntries(entries, environment = process.env) {
  const budget = configuredPrerenderBudget(environment);
  if (budget === null) return [...entries];
  return [...entries].sort(comparePrerenderPriority).slice(0, budget);
}
