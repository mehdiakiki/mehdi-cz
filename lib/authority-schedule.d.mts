import type { AuthorityOpportunity } from "../data/authority-opportunities.mjs";
import type { PublicationSlotSwap } from "../data/authority-schedule-overrides.mjs";

export type AuthorityCalendarEntry = AuthorityOpportunity & {
  action: "publish" | "upgrade";
  scheduledFor: string;
};

export const campaignStart: string;
export const campaignEnd: string;
export const campaignUtcOffset: string;
export const firstWaveOpportunityIds: string[];
export const publicationCadence: Array<{ start: string; end: string; times: string[] }>;
export function publicationSlots(): string[];
export function orderedPublicationOpportunities(): AuthorityOpportunity[];
export function validatePublicationSlotSwaps(
  swaps?: PublicationSlotSwap[],
  publications?: AuthorityCalendarEntry[]
): string[];
export function applyPublicationSlotSwaps(
  publications: AuthorityCalendarEntry[],
  swaps?: PublicationSlotSwap[]
): AuthorityCalendarEntry[];
export function buildAuthorityCalendar(): AuthorityCalendarEntry[];
export const authorityCalendar: AuthorityCalendarEntry[];
export function calendarEntryForOpportunity(id: string): AuthorityCalendarEntry | undefined;
export function validateAuthorityCalendar(calendar?: AuthorityCalendarEntry[]): string[];
