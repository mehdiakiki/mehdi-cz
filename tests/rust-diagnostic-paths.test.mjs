import assert from "node:assert/strict";
import test from "node:test";
import { availableRustDiagnosticPaths, rustDiagnosticPaths } from "../data/rust-diagnostic-paths.mjs";
import { rustFailureAtlasEntries } from "../data/rust-failure-atlas.mjs";

const now = new Date("2026-10-28T12:00:00Z");
const base = { date: "2026-10-27", draft: false, reviewed: true };
const visible = { id: "RFA-036", destinationAvailable: true, isPreview: false, destinationPath: "/rust/failures/stream-pending-never-wakes", destinationTitle: "A stream never wakes" };

test("diagnostic links respect publication gates and preserve a useful published route", () => {
  const slugs = rustDiagnosticPaths[0].articleSlugs;
  const posts = slugs.map((slug) => ({ ...base, slug, title: slug }));
  for (const flags of [{ draft: true }, { reviewed: false }, { date: "2099-01-01" }]) {
    const paths = availableRustDiagnosticPaths(posts.map((post) => ({ ...post, ...flags })), [visible], now);
    assert.deepEqual(paths[0].links.map((link) => link.href), [visible.destinationPath]);
  }
  const ready = availableRustDiagnosticPaths(posts, [visible], now);
  assert.ok(ready[0].links.some((link) => link.href === `/blog/${slugs[0]}`));
  assert.deepEqual(availableRustDiagnosticPaths([], [{ ...visible, isPreview: true }], now), []);
  assert.deepEqual(availableRustDiagnosticPaths([], [{ ...visible, destinationAvailable: false }], now), []);
});

test("diagnostic paths refer to existing cases, omit empty paths and deduplicate destinations", () => {
  const ids = new Set(rustFailureAtlasEntries.map((entry) => entry.id));
  for (const path of rustDiagnosticPaths) {
    for (const id of path.caseIds) assert.ok(ids.has(id), id);
  }
  assert.deepEqual(availableRustDiagnosticPaths([], [], now), []);
  const slug = rustDiagnosticPaths[0].articleSlugs[0];
  const entry = { ...visible, destinationPath: `/blog/${slug}` };
  const paths = availableRustDiagnosticPaths([{ ...base, slug, title: "Same destination" }], [entry], now);
  assert.equal(paths[0].links.length, 1);
});
