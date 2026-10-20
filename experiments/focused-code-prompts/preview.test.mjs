import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseContactExport } from "./session-01/candidate/parse-export.ts";
import { previewContactExport } from "./session-01/candidate/importer.ts";

const csv = readFileSync(new URL("./fixtures/contacts.csv", import.meta.url), "utf8");

test("parsing preserves source rows and uploaded text across blank and invalid records", () => {
  const parsed = parseContactExport(csv);
  assert.deepEqual(parsed.rows, [
    { rowNumber: 7, email: " Ana@example.com " },
    { rowNumber: 11, email: "ben@example.com" },
    { rowNumber: 19, email: "ana@EXAMPLE.com" },
    { rowNumber: 23, email: "ANA@example.com" },
  ]);
  assert.deepEqual(parsed.invalidRowNumbers, [3, 16]);
});

test("the real caller passes parsed rows through detection before rendering", () => {
  const preview = previewContactExport(csv);
  assert.deepEqual(preview.result.unique, [
    { rowNumber: 7, email: " Ana@example.com " },
    { rowNumber: 11, email: "ben@example.com" },
  ]);
  assert.deepEqual(preview.result.duplicates, [
    { rowNumber: 19, firstRowNumber: 7 },
    { rowNumber: 23, firstRowNumber: 7 },
  ]);
  assert.deepEqual(preview.invalidRowNumbers, [3, 16]);
});

test("the server-rendered preview shows retained rows and both original source references", () => {
  const { html } = previewContactExport(csv);
  assert.match(html, /data-source-row="7"><td>7<\/td><td> Ana@example\.com <\/td>/);
  assert.match(html, /data-source-row="11"><td>11<\/td><td>ben@example\.com<\/td>/);
  assert.equal((html.match(/data-source-row=/g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-source-row="(?:19|23)"/);
  assert.match(html, /<li>Row 19 matches row 7<\/li>/);
  assert.match(html, /<li>Row 23 matches row 7<\/li>/);
});

test("an export with only a header produces an empty preview", () => {
  const preview = previewContactExport("email\n");
  assert.deepEqual(preview.result, { unique: [], duplicates: [] });
  assert.deepEqual(preview.invalidRowNumbers, []);
  assert.doesNotMatch(preview.html, /data-source-row=/);
  assert.doesNotMatch(preview.html, /<li>/);
});
