import assert from "node:assert/strict";
import test from "node:test";

import { deduplicateContacts } from "./session-01/candidate/deduplicate.ts";

test("empty input returns both result arrays", () => {
  assert.deepEqual(deduplicateContacts([]), { unique: [], duplicates: [] });
});

test("distinct rows retain their original objects, values, and order", () => {
  const rows = [
    { rowNumber: 7, email: " Ana@example.com " },
    { rowNumber: 11, email: "ben@example.com" },
  ];
  const result = deduplicateContacts(rows);
  assert.deepEqual(result, { unique: rows, duplicates: [] });
  assert.strictEqual(result.unique[0], rows[0]);
  assert.strictEqual(result.unique[1], rows[1]);
});

test("three normalized occurrences always refer to the first source row", () => {
  const rows = [
    { rowNumber: 7, email: " Ana@example.com " },
    { rowNumber: 11, email: "ben@example.com" },
    { rowNumber: 19, email: "ana@EXAMPLE.com" },
    { rowNumber: 23, email: "ANA@example.com" },
  ];
  const originalRows = [...rows];
  const before = rows.map((row) => ({ ...row }));
  const result = deduplicateContacts(rows);

  assert.deepEqual(result.unique, [before[0], before[1]]);
  assert.strictEqual(result.unique[0], originalRows[0]);
  assert.strictEqual(result.unique[1], originalRows[1]);
  assert.deepEqual(result.duplicates, [
    { rowNumber: 19, firstRowNumber: 7 },
    { rowNumber: 23, firstRowNumber: 7 },
  ]);
  assert.deepEqual(rows, before);
  rows.forEach((row, index) => assert.strictEqual(row, originalRows[index]));
});

test("interleaved duplicate groups preserve report encounter order", () => {
  const rows = [
    { rowNumber: 3, email: "a@example.com" },
    { rowNumber: 8, email: "b@example.com" },
    { rowNumber: 15, email: " B@EXAMPLE.com " },
    { rowNumber: 18, email: "A@example.com" },
    { rowNumber: 24, email: "b@example.com" },
  ];
  const result = deduplicateContacts(rows);
  assert.deepEqual(result.unique, [rows[0], rows[1]]);
  assert.deepEqual(result.duplicates, [
    { rowNumber: 15, firstRowNumber: 8 },
    { rowNumber: 18, firstRowNumber: 3 },
    { rowNumber: 24, firstRowNumber: 8 },
  ]);
});

test("the function accepts frozen input without rewriting emails", () => {
  const first = Object.freeze({ rowNumber: 7, email: " Ana@example.com " });
  const repeated = Object.freeze({ rowNumber: 19, email: "ana@example.com" });
  const rows = Object.freeze([first, repeated]);
  const result = deduplicateContacts(rows);
  assert.strictEqual(result.unique[0], first);
  assert.equal(result.unique[0].email, " Ana@example.com ");
  assert.deepEqual(result.duplicates, [{ rowNumber: 19, firstRowNumber: 7 }]);
});
