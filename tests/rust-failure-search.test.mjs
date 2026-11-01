import assert from "node:assert/strict";
import test from "node:test";
import { rustFailureAtlasEntries } from "../data/rust-failure-atlas.mjs";
import { isCanonicalRustFailureCase } from "../data/rust-failure-intent-review.mjs";
import { prepareRustFailureSearch, searchRustFailures, rustFailureResultPage } from "../lib/rust-failure-search.mjs";

const canonical = rustFailureAtlasEntries.filter((entry) => isCanonicalRustFailureCase(entry.id));
const index = prepareRustFailureSearch(canonical);

test("a pasted compiler header ignores source paths and finds the recorded error", () => {
  for (const query of [
    "error[E0277]: Pin::new(&mut future) cannot be unpinned\n --> /private/project/src/main.rs:417:5\n | pin_this_name_is_not_in_the_index();",
    "error[E0277]: Pin::new(&mut future) cannot be unpinned --> src/main.rs:417:5",
  ]) {
    const matches = searchRustFailures(index, { query });
    assert.ok(matches.length > 0);
    assert.equal(matches[0].id, "RFA-088");
  }
});

test("a Send diagnostic and its punctuation find the future cases", () => {
  for (const query of [
    "error: future cannot be sent between threads safely\n --> src/main.rs:19:3",
    "Why is my future not `Send`?",
    "future !Send",
    "future non-Send",
  ]) {
    const matches = searchRustFailures(index, { query });
    assert.ok(matches.slice(0, 4).some((entry) => entry.id === "RFA-010"), query);
  }
});

test("error codes and case IDs are exact, including copied brackets", () => {
  const samples = prepareRustFailureSearch([
    { id: "RFA-001", area: "types", symptom: "E03080 is an unrelated identifier" },
    { id: "RFA-002", area: "types", symptom: "E0308: mismatched types" },
  ]);
  assert.deepEqual(searchRustFailures(samples, { query: "error[E0308]:" }).map((entry) => entry.id), ["RFA-002"]);
  assert.deepEqual(searchRustFailures(samples, { query: "E9999" }), []);
  for (const query of ["RFA-014", "rfa014", "[RFA_014]"]) {
    assert.deepEqual(searchRustFailures(index, { query }).map((entry) => entry.id), ["RFA-014"]);
  }
});

test("negation cannot be satisfied by a positive Send claim and an unrelated not", () => {
  const samples = prepareRustFailureSearch([
    { id: "positive", area: "async", symptom: "The future is Send", firstCheck: "It does not block a worker" },
    { id: "negative", area: "async", symptom: "The future is not Send" },
    { id: "split", area: "async", symptom: "The future is not", firstCheck: "Send the result later" },
  ]);
  assert.deepEqual(searchRustFailures(samples, { query: "future !Send" }).map((entry) => entry.id), ["negative"]);
});

test("a symptom match outranks incidental evidence and ties remain stable", () => {
  const samples = prepareRustFailureSearch([
    { id: "incidental", area: "build", symptom: "The linker cannot resolve a symbol", evidence: ["memory trace"] },
    { id: "direct", area: "async", symptom: "Memory grows while a receiver waits" },
    { id: "also-direct", area: "async", symptom: "Memory grows while a receiver waits" },
  ]);
  assert.deepEqual(searchRustFailures(samples, { query: "memory" }).map((entry) => entry.id), ["direct", "also-direct", "incidental"]);
  assert.deepEqual(searchRustFailures(samples, { query: "memory", area: "build" }).map((entry) => entry.id), ["incidental"]);
  assert.deepEqual(searchRustFailures(samples, { query: "nothing-matches" }), []);
});

test("paging reaches every case once while keeping at most forty rendered results", () => {
  const all = searchRustFailures(index);
  const first = rustFailureResultPage(all, 1);
  const combined = [];
  assert.ok(first.pageCount > 1);
  for (let page = 1; page <= first.pageCount; page++) {
    const result = rustFailureResultPage(all, page);
    assert.ok(result.entries.length <= 40);
    assert.equal(result.start, (page - 1) * 40 + 1);
    combined.push(...result.entries.map((entry) => entry.id));
  }
  assert.deepEqual(combined, all.map((entry) => entry.id));
  assert.equal(new Set(combined).size, combined.length);
  assert.equal(rustFailureResultPage(all, 99999).page, first.pageCount);
  for (const invalid of [0, -1, 1.5, "bad", Infinity]) {
    assert.equal(rustFailureResultPage(all, invalid).page, 1);
  }
  assert.deepEqual(rustFailureResultPage([], 20).entries, []);
  assert.equal(rustFailureResultPage([], 20).start, 0);
});
