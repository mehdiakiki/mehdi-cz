// How much does an eval score move between runs, and which comparison
// actually detects a real 5 point improvement?
//
//   node experiments/ai-evals/compare-versions.mjs
//
// The model of the world is deliberately simple and fully simulated:
//   * every item has a latent difficulty d in [0, 1]
//   * a version has a competence threshold theta and passes item i with
//     probability 0.03 + 0.94 * sigmoid((theta - d) * 14)
// Most items are therefore almost always passed or almost always failed,
// and a narrow band of items is genuinely flaky. That matches how a real
// eval set behaves far better than "every item is a coin flip".
//
// theta_A is solved so that version A scores exactly 70.0% on the pool, and
// theta_B so that version B scores exactly 75.0%. B is 5.0 points better by
// construction, and the script prints both means so you can check it.

import { bootstrapInterval, mcnemar, mean, normalCdf, quantile } from "./stats.mjs";
import { mulberry32, stream } from "./rng.mjs";

export const POOL_SIZE = 4000;
export const TRIALS = 4000;
export const TRUE_GAIN = 0.05;
export const BASELINE_SCORE = 0.7;
const SHARPNESS = 14;
const FLOOR = 0.03;
const CEILING = 0.97;

function passProbability(difficulty, theta) {
  return FLOOR + (CEILING - FLOOR) / (1 + Math.exp(-(theta - difficulty) * SHARPNESS));
}

/** Bisection -> find the competence threshold that gives a target mean. */
function solveTheta(difficulties, target) {
  let low = -2;
  let high = 3;
  for (let step = 0; step < 200; step += 1) {
    const mid = (low + high) / 2;
    const value = mean(difficulties.map((d) => passProbability(d, mid)));
    if (value < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function buildPool(size = POOL_SIZE) {
  const rng = stream("compare-pool");
  const difficulties = [];
  for (let i = 0; i < size; i += 1) difficulties.push(rng());
  const thetaA = solveTheta(difficulties, BASELINE_SCORE);
  const thetaB = solveTheta(difficulties, BASELINE_SCORE + TRUE_GAIN);
  return difficulties.map((difficulty, index) => ({
    index,
    difficulty,
    pA: passProbability(difficulty, thetaA),
    pB: passProbability(difficulty, thetaB),
  }));
}

function sampleItems(pool, n, rng) {
  const picked = new Array(n);
  for (let i = 0; i < n; i += 1) picked[i] = pool[Math.floor(rng() * pool.length)];
  return picked;
}

/** Mean of k independent Bernoulli draws at probability p. */
function runItem(p, k, rng) {
  let passes = 0;
  for (let r = 0; r < k; r += 1) if (rng() < p) passes += 1;
  return passes / k;
}

/**
 * Paired z test on per-item deltas. Works for k = 1 and for k > 1.
 *
 * This uses the normal approximation rather than a t distribution. At n = 50
 * that is slightly anti-conservative, so the 50 item power figures are a
 * small overstatement. At n >= 300 the difference is not visible.
 */
function pairedZTest(deltas) {
  const n = deltas.length;
  const m = mean(deltas);
  let sumSquares = 0;
  for (const d of deltas) sumSquares += (d - m) * (d - m);
  const sd = Math.sqrt(sumSquares / (n - 1));
  if (sd === 0) return { delta: m, p: m === 0 ? 1 : 0 };
  const z = m / (sd / Math.sqrt(n));
  return { delta: m, z, p: 2 * (1 - normalCdf(Math.abs(z))) };
}

function twoProportionZTest(scoreA, nA, scoreB, nB) {
  const pooled = (scoreA * nA + scoreB * nB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) return { p: 1 };
  const z = (scoreB - scoreA) / se;
  return { z, p: 2 * (1 - normalCdf(Math.abs(z))) };
}

// --- Experiment 1: a fixed threshold on an unchanged version -------------
//
// The suite is fixed, as it is in a real repository. The first run records
// the baseline, later runs change nothing at all, and the gate fails the
// build when a run scores more than `tolerance` below that baseline.

export function flakyGate({ pool, sizes, tolerance = 0.02, trials = TRIALS }) {
  return sizes.map((n) => {
    const rng = mulberry32(1000 + n);
    const suite = sampleItems(pool, n, rng);
    const scoreOnce = () => {
      let passes = 0;
      for (const item of suite) if (rng() < item.pA) passes += 1;
      return passes / n;
    };

    let red = 0;
    const scores = [];
    for (let t = 0; t < trials; t += 1) {
      // The baseline was itself recorded on one ordinary run.
      const baseline = scoreOnce();
      const score = scoreOnce();
      scores.push(score);
      if (score < baseline - tolerance) red += 1;
    }
    return {
      n,
      redRate: red / trials,
      p05: quantile(scores, 0.05),
      p95: quantile(scores, 0.95),
      spread: quantile(scores, 0.95) - quantile(scores, 0.05),
    };
  });
}

// --- Experiment 2: bootstrap CI width against N --------------------------

export function ciWidthBySize({ pool, sizes }) {
  return sizes.map((n) => {
    const rng = mulberry32(2000 + n);
    const items = sampleItems(pool, n, rng);
    const results = items.map((item) => (rng() < item.pA ? 1 : 0));
    const ci = bootstrapInterval(results, { seed: 3000 + n, resamples: 4000 });
    return { n, score: mean(results), low: ci.low, high: ci.high, width: ci.width };
  });
}

// --- Experiment 3: paired against unpaired detection power ---------------

export function detectionPower({ pool, sizes, trials = TRIALS, alpha = 0.05 }) {
  return sizes.map((n) => {
    const rng = mulberry32(4000 + n);
    let pairedWins = 0;
    let mcnemarWins = 0;
    let unpairedWins = 0;

    for (let t = 0; t < trials; t += 1) {
      // Paired -> both versions see exactly the same items.
      const shared = sampleItems(pool, n, rng);
      const deltas = new Array(n);
      let onlyA = 0;
      let onlyB = 0;
      for (let i = 0; i < n; i += 1) {
        const a = rng() < shared[i].pA ? 1 : 0;
        const b = rng() < shared[i].pB ? 1 : 0;
        deltas[i] = b - a;
        if (a === 1 && b === 0) onlyA += 1;
        if (a === 0 && b === 1) onlyB += 1;
      }
      const paired = pairedZTest(deltas);
      if (paired.p < alpha && paired.delta > 0) pairedWins += 1;
      const mc = mcnemar(onlyA, onlyB);
      if (mc.p < alpha && onlyB > onlyA) mcnemarWins += 1;

      // Unpaired -> each version gets its own independent sample.
      const itemsA = sampleItems(pool, n, rng);
      const itemsB = sampleItems(pool, n, rng);
      let passA = 0;
      let passB = 0;
      for (let i = 0; i < n; i += 1) {
        if (rng() < itemsA[i].pA) passA += 1;
        if (rng() < itemsB[i].pB) passB += 1;
      }
      const unpaired = twoProportionZTest(passA / n, n, passB / n, n);
      if (unpaired.p < alpha && passB / n > passA / n) unpairedWins += 1;
    }

    return {
      n,
      paired: pairedWins / trials,
      mcnemar: mcnemarWins / trials,
      unpaired: unpairedWins / trials,
    };
  });
}

// --- Experiment 4: repeated runs per item --------------------------------

export function repeatsAtFixedBudget({ pool, budget = 600, plans, trials = TRIALS, alpha = 0.05 }) {
  return plans.map(({ n, k }) => {
    const rng = mulberry32(5000 + n * 17 + k);
    let wins = 0;
    for (let t = 0; t < trials; t += 1) {
      const shared = sampleItems(pool, n, rng);
      const deltas = new Array(n);
      for (let i = 0; i < n; i += 1) {
        deltas[i] = runItem(shared[i].pB, k, rng) - runItem(shared[i].pA, k, rng);
      }
      const paired = pairedZTest(deltas);
      if (paired.p < alpha && paired.delta > 0) wins += 1;
    }
    return { n, k, executionsPerVersion: n * k, budget, power: wins / trials };
  });
}

function pct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function main() {
  const pool = buildPool();
  const sizes = [50, 100, 300, 1000];
  const trueMeanA = mean(pool.map((item) => item.pA));
  const trueMeanB = mean(pool.map((item) => item.pB));

  console.log(
    `pool: ${pool.length} items, true mean A ${pct(trueMeanA, 2)}, ` +
      `true mean B ${pct(trueMeanB, 2)}, true gain ${(TRUE_GAIN * 100).toFixed(1)} pts`
  );
  console.log("");

  console.log("[1] a fixed threshold gate on an UNCHANGED version A");
  console.log("    fixed suite, nothing changed between runs");
  console.log("    gate: fail if a run scores more than 2.0 pts below the recorded baseline");
  for (const row of flakyGate({ pool, sizes })) {
    console.log(
      `  n=${String(row.n).padStart(4)}  ` +
        `red builds ${pct(row.redRate).padStart(6)}  ` +
        `run to run 5th-95th percentile ${pct(row.p05)} to ${pct(row.p95)} ` +
        `(spread ${(row.spread * 100).toFixed(1)} pts)`
    );
  }
  console.log("");

  console.log("[2] bootstrap 95% CI width for a single measured score");
  for (const row of ciWidthBySize({ pool, sizes })) {
    console.log(
      `  n=${String(row.n).padStart(4)}  score ${pct(row.score)}  ` +
        `CI [${pct(row.low)}, ${pct(row.high)}]  width ${(row.width * 100).toFixed(1)} pts`
    );
  }
  console.log("");

  console.log("[3] power to detect the real 5.0 point gain (alpha = 0.05)");
  console.log("       paired = same items for both versions, one run each");
  const mcSe = (p) => Math.sqrt((p * (1 - p)) / TRIALS);
  console.log(
    `       Monte Carlo standard error at ${TRIALS} trials: ` +
      `${(mcSe(0.5) * 100).toFixed(1)} pts near 50%, ${(mcSe(0.95) * 100).toFixed(1)} pts near 95%`
  );
  for (const row of detectionPower({ pool, sizes })) {
    console.log(
      `  n=${String(row.n).padStart(4)}  paired ${pct(row.paired).padStart(6)}  ` +
        `McNemar ${pct(row.mcnemar).padStart(6)}  unpaired ${pct(row.unpaired).padStart(6)}`
    );
  }
  console.log("");

  console.log("[4] repeated runs per item at a fixed budget of 600 executions per version");
  const plans = [
    { n: 600, k: 1 },
    { n: 300, k: 2 },
    { n: 200, k: 3 },
    { n: 120, k: 5 },
    { n: 60, k: 10 },
  ];
  for (const row of repeatsAtFixedBudget({ pool, plans })) {
    console.log(
      `  items ${String(row.n).padStart(3)} x ${String(row.k).padStart(2)} runs = ` +
        `${row.executionsPerVersion} executions  power ${pct(row.power)}`
    );
  }
  console.log("");

  console.log("[5] repeated runs per item at a fixed item count of 100");
  for (const row of repeatsAtFixedBudget({
    pool,
    plans: [
      { n: 100, k: 1 },
      { n: 100, k: 3 },
      { n: 100, k: 5 },
      { n: 100, k: 10 },
    ],
  })) {
    console.log(
      `  items 100 x ${String(row.k).padStart(2)} runs = ` +
        `${String(row.executionsPerVersion).padStart(4)} executions  power ${pct(row.power)}`
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
