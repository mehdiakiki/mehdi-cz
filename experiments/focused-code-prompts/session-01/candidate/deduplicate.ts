import { normalizeEmail } from "./normalize-email.ts";
import type { ContactRow, DeduplicationResult } from "./types.ts";

export function deduplicateContacts(rows: readonly ContactRow[]): DeduplicationResult {
  const result: DeduplicationResult = { unique: [], duplicates: [] };
  const firstRowNumbers = new Map<string, number>();

  for (const row of rows) {
    const normalizedEmail = normalizeEmail(row.email);
    const firstRowNumber = firstRowNumbers.get(normalizedEmail);

    if (firstRowNumber !== undefined) {
      result.duplicates.push({ rowNumber: row.rowNumber, firstRowNumber });
    } else {
      firstRowNumbers.set(normalizedEmail, row.rowNumber);
      result.unique.push(row);
    }
  }

  return result;
}
