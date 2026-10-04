import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import { publicationSlotSwaps } from "../data/authority-schedule-overrides.mjs";

export const campaignStart = "2026-09-04";
export const campaignEnd = "2026-12-31";
export const campaignUtcOffset = "+01:00";

const explicitIsoTimestamp =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const firstWaveOpportunityIds = [
  "DATA-001",
  "RUST-026",
  "AI-023",
  "DATA-002",
  "RUST-027",
  "DATA-003",
  "RUST-028",
  "AI-003",
  "DATA-056",
  "RUST-029",
  "DATA-005",
  "RUST-030",
  "AI-016",
  "DATA-008",
  "RUST-061",
];

// These opportunities were already drafted when the calendar was frozen.
// Keep the priority list immutable: changing research/review state later must
// never move an existing article to another publication date.
export const initialDraftOpportunityIds = [
  "DATA-001",
  "DATA-002",
  "DATA-003",
  "DATA-056",
  "RUST-003",
  "RUST-004",
  "RUST-026",
  "RUST-027",
  "RUST-028",
  "RUST-029",
  "RUST-030",
  "RUST-046",
  "RUST-047",
  "RUST-048",
  "RUST-055",
  "RUST-061",
];

export const publicationCadence = [
  { start: "2026-09-04", end: "2026-09-04", times: ["09:00", "15:00"] },
  { start: "2026-09-05", end: "2026-09-16", times: ["09:00", "14:00", "19:00"] },
  { start: "2026-09-17", end: "2026-09-30", times: ["09:00", "17:00"] },
  { start: "2026-10-01", end: "2026-12-31", times: ["09:00"] },
];

function dateRange(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);

  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function timestamp(date, time) {
  return `${date}T${time}:00${campaignUtcOffset}`;
}

export function publicationSlots() {
  const slots = [];

  for (const date of dateRange(campaignStart, campaignEnd)) {
    const phase = publicationCadence.find(({ start, end }) => date >= start && date <= end);
    if (!phase) throw new Error(`No publication cadence covers ${date}`);
    for (const time of phase.times) slots.push(timestamp(date, time));
  }

  return slots;
}

function smoothWeightedOrder(opportunities) {
  const clusterOrder = ["reliable-data-integrations", "rust-under-the-hood", "reliable-ai-systems"];
  const queues = Object.fromEntries(
    clusterOrder.map((cluster) => [
      cluster,
      opportunities.filter((item) => item.cluster === cluster),
    ])
  );
  const weights = Object.fromEntries(
    clusterOrder.map((cluster) => [cluster, queues[cluster].length])
  );
  const scores = Object.fromEntries(clusterOrder.map((cluster) => [cluster, 0]));
  const totalWeight = opportunities.length;
  const ordered = [];

  while (ordered.length < opportunities.length) {
    for (const cluster of clusterOrder) {
      if (queues[cluster].length > 0) scores[cluster] += weights[cluster];
    }

    const selected = clusterOrder
      .filter((cluster) => queues[cluster].length > 0)
      .sort((left, right) => scores[right] - scores[left])[0];

    ordered.push(queues[selected].shift());
    scores[selected] -= totalWeight;
  }

  return ordered;
}

export function orderedPublicationOpportunities(opportunities = authorityOpportunities) {
  const publishable = opportunities.filter((item) => item.stage !== "upgrade");
  const byId = new Map(publishable.map((item) => [item.id, item]));
  const firstWave = firstWaveOpportunityIds.map((id) => byId.get(id));
  const missingFirstWaveIds = firstWaveOpportunityIds.filter((id) => !byId.has(id));
  if (missingFirstWaveIds.length > 0) {
    throw new Error(`Unknown first-wave opportunities: ${missingFirstWaveIds.join(", ")}`);
  }
  const firstWaveSet = new Set(firstWaveOpportunityIds);
  const initialDraftSet = new Set(initialDraftOpportunityIds);
  const remaining = publishable
    .filter((item) => !firstWaveSet.has(item.id))
    .sort(
      (left, right) => Number(initialDraftSet.has(right.id)) - Number(initialDraftSet.has(left.id))
    );

  return [...firstWave, ...smoothWeightedOrder(remaining)];
}

export function validatePublicationSlotSwaps(
  swaps = publicationSlotSwaps,
  publications = orderedPublicationOpportunities().map((opportunity, index) => ({
    ...opportunity,
    scheduledFor: publicationSlots()[index],
  }))
) {
  const errors = [];
  const usedIds = new Set();
  const byId = new Map(publications.map((entry) => [entry.id, entry]));

  for (const swap of swaps) {
    if (!swap || typeof swap !== "object" || Array.isArray(swap)) {
      errors.push("every publication slot swap must be an audit record");
      continue;
    }
    const { delayedId, replacementId, decidedAt, replacementWasHeld, reason } = swap;
    if (delayedId === replacementId) {
      errors.push(`${delayedId} cannot swap a slot with itself`);
    }
    for (const id of [delayedId, replacementId]) {
      if (!byId.has(id)) errors.push(`${id} is not a publication opportunity`);
      if (usedIds.has(id)) errors.push(`${id} appears in more than one slot swap`);
      usedIds.add(id);
    }

    const delayed = byId.get(delayedId);
    const replacement = byId.get(replacementId);
    const decisionTime =
      typeof decidedAt === "string" && explicitIsoTimestamp.test(decidedAt)
        ? new Date(decidedAt).getTime()
        : Number.NaN;
    if (!Number.isFinite(decisionTime))
      errors.push(`${delayedId} has an invalid swap decision time`);
    if (delayed && replacement) {
      const delayedTime = new Date(delayed.scheduledFor).getTime();
      const replacementTime = new Date(replacement.scheduledFor).getTime();
      if (replacementTime <= delayedTime) {
        errors.push(`${replacementId} does not have a later publication slot`);
      }
      if (Number.isFinite(decisionTime) && decisionTime <= delayedTime) {
        errors.push(`${delayedId} had not missed its slot when the swap was decided`);
      }
      if (Number.isFinite(decisionTime) && decisionTime >= replacementTime) {
        errors.push(`${replacementId} was no longer in a future slot when the swap was decided`);
      }
    }
    if (replacementWasHeld !== true) {
      errors.push(`${replacementId} must be recorded as held when the swap is decided`);
    }
    if (typeof reason !== "string" || reason.trim() === "") {
      errors.push(`${delayedId} slot swap is missing a reason`);
    }
  }

  return errors;
}

export function applyPublicationSlotSwaps(publications, swaps = publicationSlotSwaps) {
  if (validatePublicationSlotSwaps(swaps, publications).length) {
    return publications.map((entry) => ({ ...entry }));
  }

  const swapped = publications.map((entry) => ({ ...entry }));
  const byId = new Map(swapped.map((entry) => [entry.id, entry]));
  for (const { delayedId, replacementId } of swaps) {
    const left = byId.get(delayedId);
    const right = byId.get(replacementId);
    [left.scheduledFor, right.scheduledFor] = [right.scheduledFor, left.scheduledFor];
  }
  return swapped;
}

function evenlyDistributedDates(count) {
  const dates = dateRange(campaignStart, campaignEnd);
  if (count === 1) return [dates[0]];

  return Array.from({ length: count }, (_, index) => {
    const dateIndex = Math.round((index * (dates.length - 1)) / (count - 1));
    return dates[dateIndex];
  });
}

export function buildAuthorityCalendar() {
  const publishOpportunities = orderedPublicationOpportunities();
  const slots = publicationSlots();
  const upgrades = smoothWeightedOrder(
    authorityOpportunities.filter((item) => item.stage === "upgrade")
  );
  const upgradeDates = evenlyDistributedDates(upgrades.length);

  const publications = applyPublicationSlotSwaps(
    publishOpportunities.map((opportunity, index) => ({
      ...opportunity,
      action: "publish",
      scheduledFor: slots[index],
    }))
  );
  const upgradeActions = upgrades.map((opportunity, index) => ({
    ...opportunity,
    action: "upgrade",
    scheduledFor: timestamp(upgradeDates[index], "12:00"),
  }));

  return [...publications, ...upgradeActions].sort(
    (left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime()
  );
}

export const authorityCalendar = buildAuthorityCalendar();

export function calendarEntryForOpportunity(id) {
  return authorityCalendar.find((entry) => entry.id === id);
}

export function validateAuthorityCalendar(calendar = authorityCalendar) {
  const errors = [...validatePublicationSlotSwaps()];
  const opportunityIds = new Set(authorityOpportunities.map((item) => item.id));
  const calendarIds = calendar.map((entry) => entry.id);
  const publications = calendar.filter((entry) => entry.action === "publish");
  const upgrades = calendar.filter((entry) => entry.action === "upgrade");
  const scheduledInstants = calendar.map((entry) => entry.scheduledFor);

  if (calendar.length !== authorityOpportunities.length) {
    errors.push(`expected ${authorityOpportunities.length} actions, found ${calendar.length}`);
  }
  if (new Set(calendarIds).size !== calendarIds.length) {
    errors.push("an opportunity appears more than once in the calendar");
  }
  if (calendarIds.some((id) => !opportunityIds.has(id))) {
    errors.push("the calendar contains an unknown opportunity");
  }
  if (new Set(scheduledInstants).size !== scheduledInstants.length) {
    errors.push("two campaign actions share the same instant");
  }
  if (publications.length !== 158 || upgrades.length !== 42) {
    errors.push(
      `expected 158 publications and 42 upgrades, found ${publications.length} and ${upgrades.length}`
    );
  }
  if (
    calendar.some(
      (entry) =>
        (entry.stage === "upgrade" && entry.action !== "upgrade") ||
        (entry.stage !== "upgrade" && entry.action !== "publish")
    )
  ) {
    errors.push("a calendar action does not match its frozen source state");
  }
  if (calendar.some((entry) => entry.scheduledFor.slice(0, 10) < campaignStart)) {
    errors.push("an action is scheduled before the campaign starts");
  }
  if (calendar.some((entry) => entry.scheduledFor.slice(0, 10) > campaignEnd)) {
    errors.push("an action is scheduled after the campaign ends");
  }
  if (calendar.some((entry) => Number.isNaN(new Date(entry.scheduledFor).getTime()))) {
    errors.push("the calendar contains an invalid ISO timestamp");
  }
  if (calendar.some((entry) => !entry.scheduledFor.endsWith(campaignUtcOffset))) {
    errors.push(`a calendar action does not use the campaign offset ${campaignUtcOffset}`);
  }

  for (const date of dateRange(campaignStart, campaignEnd)) {
    const phase = publicationCadence.find(({ start, end }) => date >= start && date <= end);
    const expected = phase?.times.length ?? 0;
    const actual = publications.filter((entry) => entry.scheduledFor.startsWith(date)).length;
    if (actual !== expected) {
      errors.push(`${date} has ${actual} publication slots; expected ${expected}`);
    }
  }

  return errors;
}
