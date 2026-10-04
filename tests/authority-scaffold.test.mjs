import assert from "node:assert/strict";
import test from "node:test";

import { authorityArticleTemplate, scaffoldPlan } from "../scripts/scaffold-authority-article.mjs";

test("a scaffold carries its calendar date and both publication locks", () => {
  const plan = scaffoldPlan("DATA-005", "/tmp/example-site");

  assert.equal(
    plan.filePath,
    "/tmp/example-site/data/blog/identity-mapping-tables-the-small-data-structure-every-integration-needs.mdx"
  );
  assert.match(plan.source, /date: "2026-[^\n]+\+01:00"/);
  assert.match(plan.source, /draft: true/);
  assert.match(plan.source, /reviewed: false/);
  assert.match(plan.source, /campaign: "authority-2026"/);
  assert.match(plan.source, /opportunity: "DATA-005"/);
  assert.match(plan.source, /TODO/);
});

test("an existing URL cannot be scaffolded as a duplicate", () => {
  assert.throws(
    () => scaffoldPlan("DATA-004", "/tmp/example-site"),
    /must not create a second URL/
  );
});

test("the template includes the opportunity's promised evidence", () => {
  const opportunity = {
    id: "TEST-001",
    workingTitle: "A Safe Test",
    evidencePlan: "a reproducible harness",
    cluster: "reliable-ai-systems",
  };
  const source = authorityArticleTemplate(opportunity, {
    scheduledFor: "2026-10-01T09:00:00+01:00",
  });

  assert.match(source, /a reproducible harness/);
  assert.match(source, /cluster: "reliable-ai-systems"/);
  assert.match(source, /## Short answer/);
  assert.match(source, /## Reproducible evidence/);
  assert.match(source, /## Failure modes and trade-offs/);
  assert.match(source, /## Primary sources/);
});
