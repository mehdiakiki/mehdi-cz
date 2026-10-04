import assert from "node:assert/strict";
import test from "node:test";

import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import {
  applyPublicationSlotSwaps,
  authorityCalendar,
  firstWaveOpportunityIds,
  initialDraftOpportunityIds,
  orderedPublicationOpportunities,
  publicationCadence,
  publicationSlots,
  validateAuthorityCalendar,
  validatePublicationSlotSwaps,
} from "../lib/authority-schedule.mjs";

const publications = authorityCalendar.filter((entry) => entry.action === "publish");
const upgrades = authorityCalendar.filter((entry) => entry.action === "upgrade");

test("the calendar assigns every opportunity exactly once", () => {
  assert.equal(authorityCalendar.length, 200);
  assert.equal(new Set(authorityCalendar.map((entry) => entry.id)).size, 200);
  assert.deepEqual(validateAuthorityCalendar(), []);
});

test("158 new pages and 42 existing upgrades fit through December", () => {
  assert.equal(publications.length, 158);
  assert.equal(upgrades.length, 42);
  assert.equal(publicationSlots().length, 158);
  assert.equal(publications[0].scheduledFor, "2026-09-04T09:00:00+01:00");
  assert.equal(publications.at(-1).scheduledFor, "2026-12-31T09:00:00+01:00");
});

test("the 3-2-1 publication curve fits all 158 new articles through December", () => {
  const counts = Object.fromEntries(
    ["2026-09", "2026-10", "2026-11", "2026-12"].map((month) => [
      month,
      publications.filter((entry) => entry.scheduledFor.startsWith(month)).length,
    ])
  );

  assert.deepEqual(counts, {
    "2026-09": 66,
    "2026-10": 31,
    "2026-11": 30,
    "2026-12": 31,
  });
  assert.deepEqual(publicationCadence, [
    { start: "2026-09-04", end: "2026-09-04", times: ["09:00", "15:00"] },
    { start: "2026-09-05", end: "2026-09-16", times: ["09:00", "14:00", "19:00"] },
    { start: "2026-09-17", end: "2026-09-30", times: ["09:00", "17:00"] },
    { start: "2026-10-01", end: "2026-12-31", times: ["09:00"] },
  ]);
});

test("the first wave is deliberately mixed across all three series", () => {
  const initialOrder = orderedPublicationOpportunities();
  assert.deepEqual(
    initialOrder.slice(0, firstWaveOpportunityIds.length).map((entry) => entry.id),
    firstWaveOpportunityIds
  );

  const firstWave = initialOrder.slice(0, firstWaveOpportunityIds.length);
  assert.equal(firstWave.filter((entry) => entry.cluster === "rust-under-the-hood").length, 6);
  assert.equal(
    firstWave.filter((entry) => entry.cluster === "reliable-data-integrations").length,
    6
  );
  assert.equal(firstWave.filter((entry) => entry.cluster === "reliable-ai-systems").length, 3);
});

test("research workflow changes cannot reorder the frozen publication calendar", () => {
  assert.equal(initialDraftOpportunityIds.length, 16);
  const baseline = orderedPublicationOpportunities().map((entry) => entry.id);
  const changedWorkflowState = authorityOpportunities.map((entry) =>
    entry.id === "AI-009" ? { ...entry, stage: "draft" } : entry
  );

  assert.deepEqual(
    orderedPublicationOpportunities(changedWorkflowState).map((entry) => entry.id),
    baseline
  );
});

test("the full publication stream preserves the portfolio mix", () => {
  assert.deepEqual(
    Object.fromEntries(
      ["rust-under-the-hood", "reliable-data-integrations", "reliable-ai-systems"].map(
        (cluster) => [cluster, publications.filter((entry) => entry.cluster === cluster).length]
      )
    ),
    {
      "rust-under-the-hood": 53,
      "reliable-data-integrations": 73,
      "reliable-ai-systems": 32,
    }
  );

  let longestRun = 1;
  let currentRun = 1;
  for (let index = 1; index < publications.length; index += 1) {
    currentRun =
      publications[index].cluster === publications[index - 1].cluster ? currentRun + 1 : 1;
    longestRun = Math.max(longestRun, currentRun);
  }
  assert.ok(longestRun <= 2);
});

test("calendar entries preserve each opportunity's current workflow state", () => {
  const sourceById = new Map(authorityOpportunities.map((entry) => [entry.id, entry]));

  assert.ok(
    authorityCalendar.every((entry) => {
      const source = sourceById.get(entry.id);
      return (
        entry.validation === source.validation && entry.publishDecision === source.publishDecision
      );
    })
  );
});

test("each launch date has the intended number of new-article slots", () => {
  const slotsOn = (date) => publications.filter((entry) => entry.scheduledFor.startsWith(date));

  assert.equal(slotsOn("2026-09-04").length, 2);
  assert.equal(slotsOn("2026-09-05").length, 3);
  assert.equal(slotsOn("2026-09-16").length, 3);
  assert.equal(slotsOn("2026-09-17").length, 2);
  assert.equal(slotsOn("2026-09-30").length, 2);
  assert.equal(slotsOn("2026-10-01").length, 1);
  assert.equal(slotsOn("2026-12-31").length, 1);
});

test("all publication and upgrade instants are unique and use Casablanca's campaign offset", () => {
  assert.equal(
    new Set(authorityCalendar.map((entry) => entry.scheduledFor)).size,
    authorityCalendar.length
  );
  assert.ok(authorityCalendar.every((entry) => entry.scheduledFor.endsWith("+01:00")));
});

test("a missed article can swap with one later held slot without changing cadence", () => {
  const entries = [
    { id: "DATA-001", scheduledFor: "2026-09-04T09:00:00+01:00" },
    { id: "DATA-005", scheduledFor: "2026-09-09T09:00:00+01:00" },
  ];
  const swap = {
    delayedId: "DATA-001",
    replacementId: "DATA-005",
    decidedAt: "2026-09-04T10:00:00+01:00",
    replacementWasHeld: true,
    reason: "DATA-001 needs another verification pass",
  };
  const swapped = applyPublicationSlotSwaps(entries, [swap]);

  assert.equal(swapped[0].scheduledFor, "2026-09-09T09:00:00+01:00");
  assert.equal(swapped[1].scheduledFor, "2026-09-04T09:00:00+01:00");
  assert.equal(new Set(swapped.map((entry) => entry.scheduledFor)).size, 2);
});

test("slot swaps reject unknown, duplicate, and self-referential IDs", () => {
  const entries = [
    { id: "DATA-001", scheduledFor: "2026-09-04T09:00:00+01:00" },
    { id: "RUST-026", scheduledFor: "2026-09-04T15:00:00+01:00" },
    { id: "DATA-005", scheduledFor: "2026-09-09T09:00:00+01:00" },
  ];
  const record = (delayedId, replacementId) => ({
    delayedId,
    replacementId,
    decidedAt: "2026-09-04T10:00:00+01:00",
    replacementWasHeld: true,
    reason: "Test recovery",
  });

  assert.ok(validatePublicationSlotSwaps([record("DATA-001", "DATA-001")], entries).length > 0);
  assert.ok(validatePublicationSlotSwaps([record("DATA-001", "UNKNOWN")], entries).length > 0);
  assert.ok(
    validatePublicationSlotSwaps(
      [record("DATA-001", "DATA-005"), record("DATA-001", "RUST-026")],
      entries
    ).length > 0
  );
});

test("a slot swap records that the replacement was later and still held", () => {
  const entries = [
    { id: "DATA-001", scheduledFor: "2026-09-04T09:00:00+01:00" },
    { id: "DATA-005", scheduledFor: "2026-09-09T09:00:00+01:00" },
  ];
  const base = {
    delayedId: "DATA-001",
    replacementId: "DATA-005",
    reason: "Recovery",
  };

  assert.ok(
    validatePublicationSlotSwaps(
      [{ ...base, decidedAt: "2026-09-03T10:00:00+01:00", replacementWasHeld: true }],
      entries
    ).some((error) => error.includes("had not missed"))
  );
  assert.ok(
    validatePublicationSlotSwaps(
      [{ ...base, decidedAt: entries[0].scheduledFor, replacementWasHeld: true }],
      entries
    ).some((error) => error.includes("had not missed"))
  );
  assert.ok(
    validatePublicationSlotSwaps(
      [{ ...base, decidedAt: "2026-09-09T10:00:00+01:00", replacementWasHeld: true }],
      entries
    ).some((error) => error.includes("no longer in a future slot"))
  );
  assert.ok(
    validatePublicationSlotSwaps(
      [{ ...base, decidedAt: "2026-09-04T10:00:00+01:00", replacementWasHeld: false }],
      entries
    ).some((error) => error.includes("recorded as held"))
  );
  for (const decidedAt of ["2026-09-04T10:00:00", Date.parse("2026-09-04T10:00:00Z")]) {
    assert.ok(
      validatePublicationSlotSwaps(
        [{ ...base, decidedAt, replacementWasHeld: true }],
        entries
      ).some((error) => error.includes("invalid swap decision time"))
    );
  }
});
