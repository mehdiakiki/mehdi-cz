// Small statistics helpers. No dependencies, no matrix library.
import { mulberry32 } from "./rng.mjs";

export function mean(values) {
  if (values.length === 0) return Number.NaN;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

export function quantile(values, q) {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Wilson score interval -> better than the normal interval for small n. */
export function wilsonInterval(successes, total, z = 1.96) {
  if (total === 0) return { low: 0, high: 1, width: 1 };
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const spread =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
  const low = Math.max(0, center - spread);
  const high = Math.min(1, center + spread);
  return { low, high, width: high - low };
}

/** Percentile bootstrap over a seeded resample of the same items. */
export function bootstrapInterval(values, { seed = 1, resamples = 4000, alpha = 0.05 } = {}) {
  const rng = mulberry32(seed);
  const n = values.length;
  const means = new Array(resamples);
  for (let r = 0; r < resamples; r += 1) {
    let total = 0;
    for (let i = 0; i < n; i += 1) total += values[Math.floor(rng() * n)];
    means[r] = total / n;
  }
  const low = quantile(means, alpha / 2);
  const high = quantile(means, 1 - alpha / 2);
  return { low, high, width: high - low };
}

/**
 * Paired bootstrap over per-item deltas. The item index is resampled once
 * and used for both versions, so item difficulty cancels out.
 */
export function pairedBootstrapInterval(deltas, options = {}) {
  return bootstrapInterval(deltas, options);
}

/** Standard normal cumulative distribution (Abramowitz and Stegun 7.1.26). */
export function normalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

/**
 * McNemar test with continuity correction on the discordant pairs.
 * b -> A passed and B failed. c -> A failed and B passed.
 */
export function mcnemar(b, c) {
  const discordant = b + c;
  if (discordant === 0) return { discordant, chiSquare: 0, p: 1 };
  const chiSquare = Math.pow(Math.abs(b - c) - 1, 2) / discordant;
  const p = 2 * (1 - normalCdf(Math.sqrt(chiSquare)));
  return { discordant, chiSquare, p: Math.min(1, p) };
}

/** Cohen's kappa for two binary label vectors of the same length. */
export function cohenKappa(labelsA, labelsB) {
  const n = labelsA.length;
  let agree = 0;
  let a1 = 0;
  let b1 = 0;
  for (let i = 0; i < n; i += 1) {
    if (labelsA[i] === labelsB[i]) agree += 1;
    if (labelsA[i]) a1 += 1;
    if (labelsB[i]) b1 += 1;
  }
  const observed = agree / n;
  const expected = (a1 / n) * (b1 / n) + (1 - a1 / n) * (1 - b1 / n);
  if (expected === 1) return { observed, expected, kappa: 1 };
  return { observed, expected, kappa: (observed - expected) / (1 - expected) };
}

export function percent(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function points(value, digits = 1) {
  return `${(value * 100).toFixed(digits)} pts`;
}
