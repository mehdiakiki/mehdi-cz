import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { auditRustFailureAtlas } from "../scripts/audit-rust-failure-atlas.mjs";

test("the Atlas audit covers every dedicated case and its discovery path", () => {
  const audit = auditRustFailureAtlas();

  assert.equal(audit.inventory.records, 722);
  assert.equal(audit.inventory.canonicalRecords, 717);
  assert.equal(audit.inventory.dedicatedArticles, 694);
  assert.equal(audit.inventory.canonicalDedicatedArticles, 689);
  assert.equal(audit.inventory.canonicalExecutableEvidence, 689);
  assert.deepEqual(audit.answerQuality.missingArticle, []);
  assert.deepEqual(audit.answerQuality.weakSearchLanguage, []);
  assert.deepEqual(audit.answerQuality.repeatedSearchTerms, []);
  assert.deepEqual(audit.answerQuality.possibleDuplicateCases, []);
  assert.deepEqual(audit.evidence.untrailedDedicatedCases, []);
  assert.deepEqual(
    audit.evidence.dedicatedWithoutExecutableEvidence,
    Array.from({ length: 22 }, (_, index) => `RFA-${String(index + 29).padStart(3, "0")}`).filter(
      (caseId) =>
        !new Set([
          "RFA-031",
          "RFA-032",
          "RFA-033",
          "RFA-034",
          "RFA-035",
          "RFA-036",
          "RFA-037",
          "RFA-038",
          "RFA-039",
          "RFA-040",
          "RFA-041",
          "RFA-042",
          "RFA-043",
          "RFA-044",
          "RFA-045",
          "RFA-046",
          "RFA-047",
          "RFA-048",
          "RFA-049",
          "RFA-050",
          "RFA-029",
          "RFA-030",
        ]).has(caseId)
    ),
    "only the original environment- and process-dependent case files may lack portable fixtures"
  );
});

test("dedicated case pages expose the diagnosis in visible text and structured data", () => {
  const route = readFileSync("app/(site)/rust/failures/[slug]/page.tsx", "utf8");

  assert.match(route, /Direct answer/);
  assert.match(route, /What this Rust failure means/);
  assert.match(route, /indexEntry\.likelyCause/);
  assert.match(route, /indexEntry\.firstCheck/);
  assert.match(route, /abstract:/);
  assert.match(route, /citation: failure\.sources/);
});
