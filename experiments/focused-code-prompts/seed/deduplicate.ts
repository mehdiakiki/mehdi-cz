import type { ContactRow, DeduplicationResult } from "./types.ts";

export function deduplicateContacts(
  _rows: readonly ContactRow[]
): DeduplicationResult {
  throw new Error("Duplicate detection has not been implemented");
}
