/**
 * Pair a missed publication with a publication that was still held in a later
 * slot when the recovery decision was made. The timestamp makes that condition
 * auditable after the replacement article is eventually approved.
 *
 * Example:
 * {
 *   delayedId: "DATA-001",
 *   replacementId: "DATA-005",
 *   decidedAt: "2026-09-04T10:00:00+01:00",
 *   replacementWasHeld: true,
 *   reason: "DATA-001 needs another verification pass",
 * }
 */
export const publicationSlotSwaps = [];
