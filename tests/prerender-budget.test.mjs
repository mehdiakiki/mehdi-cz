import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  comparePrerenderPriority,
  configuredPrerenderBudget,
  selectPrerenderEntries,
} from "../lib/prerender-budget.mjs";

const blogRoutePath = new URL("../app/(site)/blog/[...slug]/page.tsx", import.meta.url);
const rustRoutePath = new URL(
  "../app/(site)/rust/failures/[slug]/page.tsx",
  import.meta.url
);

function entries(count) {
  return Array.from({ length: count }, (_, index) => ({
    slug: `route-${String(index).padStart(3, "0")}`,
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));
}

test("ordinary and export builds remain exhaustive", () => {
  const routes = entries(30);

  assert.equal(configuredPrerenderBudget({}), null);
  assert.deepEqual(selectPrerenderEntries(routes, {}), routes);
  assert.equal(configuredPrerenderBudget({ EXPORT: "1", PRERENDER_BUDGET: "25" }), null);
  assert.deepEqual(
    selectPrerenderEntries(routes, { EXPORT: "1", PRERENDER_BUDGET: "25" }),
    routes
  );
});

test("bounded server builds select newest routes with a stable slug tie break", () => {
  const routes = entries(30);
  routes[0] = { slug: "z-tie", date: "2026-02-01T00:00:00.000Z" };
  routes[1] = { slug: "a-tie", date: "2026-02-01T00:00:00.000Z" };

  const selected = selectPrerenderEntries(routes, { PRERENDER_BUDGET: "25" });

  assert.equal(selected.length, 25);
  assert.deepEqual(
    selected.slice(0, 2).map((entry) => entry.slug),
    ["a-tie", "z-tie"]
  );
  assert.deepEqual([...selected].sort(comparePrerenderPriority), selected);
});

test("unsupported budgets fail closed", () => {
  for (const value of ["0", "-1", "24", "25.5", "500", "nope"]) {
    assert.throws(
      () => configuredPrerenderBudget({ PRERENDER_BUDGET: value }),
      /must be one of 25, 100, or 250/
    );
  }
});

test("both high-cardinality routes keep on-demand fallback explicit", async () => {
  const [blogRoute, rustRoute] = await Promise.all([
    readFile(blogRoutePath, "utf8"),
    readFile(rustRoutePath, "utf8"),
  ]);

  for (const route of [blogRoute, rustRoute]) {
    assert.match(route, /export const dynamicParams = true/);
    assert.match(route, /export const revalidate = false/);
    assert.match(route, /selectPrerenderEntries\(/);
  }
});
