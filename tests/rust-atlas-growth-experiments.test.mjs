import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getRustAtlasGrowthCohort,
  rustAtlasGrowthExperiments,
} from "../data/rust-atlas-growth-experiments.mjs";
import { rustFailureAtlasEntries } from "../data/rust-failure-atlas.mjs";
import { analyzeRustAtlasGrowth } from "../scripts/analyze-rust-atlas-growth.mjs";

const experiment = rustAtlasGrowthExperiments[0];
const entriesById = new Map(rustFailureAtlasEntries.map((entry) => [entry.id, entry]));

test("the first growth experiment is an equally sized, non-overlapping learning batch", () => {
  assert.equal(experiment.id, "RGE-001");
  assert.equal(experiment.minimumWindowDays, 28);
  assert.equal(experiment.reportingLagDays, 3);
  assert.equal(experiment.nextBatchSize, 20);
  assert.equal(experiment.explorationShare, 0.4);
  assert.deepEqual(experiment.dimensions, ["page", "query"]);

  const caseIds = experiment.cohorts.flatMap((cohort) => cohort.caseIds);
  assert.equal(experiment.cohorts.length, 2);
  assert.ok(experiment.cohorts.every((cohort) => cohort.caseIds.length === 5));
  assert.equal(new Set(caseIds).size, 10);
  assert.deepEqual(
    caseIds,
    Array.from({ length: 10 }, (_, index) => `RFA-${126 + index}`)
  );

  for (const caseId of caseIds) {
    assert.ok(entriesById.get(caseId)?.caseSlug, `${caseId} needs a canonical case page`);
    assert.ok(getRustAtlasGrowthCohort(caseId), `${caseId} needs an experiment cohort`);
  }
});

test("growth analysis uses per-page medians and preserves an exploratory allocation", () => {
  const rows = experiment.cohorts.flatMap((cohort, cohortIndex) =>
    cohort.caseIds.flatMap((caseId, pageIndex) => {
      const entry = entriesById.get(caseId);
      const page = `https://www.mehdi.cz/rust/failures/${entry.caseSlug}`;
      const impressions = cohortIndex === 0 ? 30 : 10;
      return [
        {
          keys: [page, `rust ${cohort.slug} example number ${pageIndex}`],
          clicks: cohortIndex === 0 ? 3 : 1,
          impressions,
          ctr: 0.1,
          position: cohortIndex === 0 ? 8 : 12,
        },
        {
          keys: [page, `mehdi akiki ${caseId}`],
          clicks: 50,
          impressions: 500,
          ctr: 0.1,
          position: 1,
        },
      ];
    })
  );

  const report = analyzeRustAtlasGrowth({
    experiment,
    searchAnalytics: { rows },
    startDate: "2026-09-05",
    endDate: "2026-10-02",
  });

  assert.equal(report.window.observationDays, 28);
  assert.equal(report.cohorts[0].medianImpressionsPerPage, 30);
  assert.equal(report.cohorts[1].medianImpressionsPerPage, 10);
  assert.equal(report.cohorts[0].impressions, 150, "branded rows must be excluded");
  assert.equal(report.decision.status, "directional");
  assert.equal(report.decision.leader, "compiler-diagnostic");
  assert.deepEqual(report.decision.allocation, [
    { cohort: "compiler-diagnostic", pages: 12 },
    { cohort: "runtime-invariant", pages: 8 },
  ]);
});

test("growth instrumentation stays attached to Atlas entry and evidence links", () => {
  const atlasPage = readFileSync(path.resolve("app/(site)/rust/page.tsx"), "utf8");
  const casePage = readFileSync(path.resolve("app/(site)/rust/failures/[slug]/page.tsx"), "utf8");

  assert.match(atlasPage, /rust-atlas-entry-open/);
  assert.match(casePage, /rust-failure-evidence-download/);
  assert.match(casePage, /rust-failure-sequence-open/);
  assert.match(casePage, /rust-failure-professional-cta/);
});
