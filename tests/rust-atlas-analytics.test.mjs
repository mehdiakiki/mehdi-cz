import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("Atlas entry and evidence links retain per-case analytics", () => {
  const atlasPage = readFileSync(path.resolve("app/(site)/rust/page.tsx"), "utf8");
  const casePage = readFileSync(path.resolve("app/(site)/rust/failures/[slug]/page.tsx"), "utf8");

  assert.match(atlasPage, /rust-atlas-entry-open/);
  assert.match(casePage, /rust-failure-evidence-download/);
  assert.match(casePage, /rust-failure-sequence-open/);
  assert.match(casePage, /rust-failure-professional-cta/);
});
