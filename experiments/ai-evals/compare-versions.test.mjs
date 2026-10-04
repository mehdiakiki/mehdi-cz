// Pins every number the "Eval Scores Move Between Runs" article quotes.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPool,
  ciWidthBySize,
  detectionPower,
  flakyGate,
  repeatsAtFixedBudget,
  TRUE_GAIN,
} from "./compare-versions.mjs";
import { mean } from "./stats.mjs";

const round = (value, digits) => Number(value.toFixed(digits));
const pool = buildPool();
const sizes = [50, 100, 300, 1000];

test("the simulated pool has the intended true means", () => {
  assert.equal(pool.length, 4000);
  assert.equal(round(mean(pool.map((item) => item.pA)), 4), 0.7);
  assert.equal(round(mean(pool.map((item) => item.pB)), 4), 0.75);
  assert.equal(
    round(mean(pool.map((item) => item.pB - item.pA)), 4),
    round(TRUE_GAIN, 4)
  );
});

test("a fixed threshold gate goes red on an unchanged version", () => {
  const rows = flakyGate({ pool, sizes });
  assert.deepEqual(
    rows.map((row) => [row.n, round(row.redRate * 100, 1)]),
    [
      [50, 29.2],
      [100, 28.6],
      [300, 19.5],
      [1000, 6.8],
    ]
  );
  assert.ok(rows[0].redRate > rows[3].redRate, "more items means fewer random red builds");
});

test("bootstrap confidence interval width shrinks roughly with the square root of N", () => {
  const rows = ciWidthBySize({ pool, sizes });
  assert.deepEqual(
    rows.map((row) => [row.n, round(row.width * 100, 1)]),
    [
      [50, 26.0],
      [100, 18.0],
      [300, 10.0],
      [1000, 5.7],
    ]
  );
});

test("a paired comparison detects the real 5 point gain far earlier", () => {
  const rows = detectionPower({ pool, sizes });
  assert.deepEqual(
    rows.map((row) => [
      row.n,
      round(row.paired * 100, 1),
      round(row.mcnemar * 100, 1),
      round(row.unpaired * 100, 1),
    ]),
    [
      [50, 12.3, 7.2, 8.1],
      [100, 22.0, 13.5, 12.6],
      [300, 51.8, 46.8, 27.5],
      [1000, 95.9, 95.4, 69.9],
    ]
  );

  for (const row of rows) {
    assert.ok(row.paired >= row.unpaired, `paired should never lose at n=${row.n}`);
  }
  const paired300 = rows.find((row) => row.n === 300).paired;
  const unpaired1000 = rows.find((row) => row.n === 1000).unpaired;
  assert.ok(
    paired300 < unpaired1000,
    "paired at 300 is strong but still below unpaired at 1000"
  );
});

test("at a fixed execution budget, more items beats more repeats", () => {
  const rows = repeatsAtFixedBudget({
    pool,
    plans: [
      { n: 600, k: 1 },
      { n: 300, k: 2 },
      { n: 200, k: 3 },
      { n: 120, k: 5 },
      { n: 60, k: 10 },
    ],
  });
  assert.deepEqual(
    rows.map((row) => [row.n, row.k, round(row.power * 100, 1)]),
    [
      [600, 1, 81.3],
      [300, 2, 82.2],
      [200, 3, 80.2],
      [120, 5, 79.9],
      [60, 10, 77.0],
    ]
  );
  const best = Math.max(...rows.map((row) => row.power));
  const worst = Math.min(...rows.map((row) => row.power));
  assert.ok(best - worst < 0.06, "the whole budget curve is flat, so repeats buy little");
  assert.ok(rows.at(-1).power < rows[0].power, "60 items x 10 runs is the weakest plan");
});

test("at a fixed item count, repeats do buy power", () => {
  const rows = repeatsAtFixedBudget({
    pool,
    plans: [
      { n: 100, k: 1 },
      { n: 100, k: 3 },
      { n: 100, k: 5 },
      { n: 100, k: 10 },
    ],
  });
  assert.deepEqual(
    rows.map((row) => [row.k, round(row.power * 100, 1)]),
    [
      [1, 21.6],
      [3, 50.4],
      [5, 71.7],
      [10, 93.7],
    ]
  );
});
