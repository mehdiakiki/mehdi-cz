import { normalizeEmail } from "./normalize-email.ts";
import type { ContactRow } from "./types.ts";

export type ParsedExport = {
  rows: ContactRow[];
  invalidRowNumbers: number[];
};

// This fixture accepts a single email column and one record per physical line.
// It rejects extra columns and multiline fields; it is not a general CSV parser.
export function parseContactExport(csv: string): ParsedExport {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0] !== "email") {
    throw new Error("Expected an email header");
  }

  const rows: ContactRow[] = [];
  const invalidRowNumbers: number[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const record = lines[index];
    if (record.trim() === "") continue;

    const quoted = /^"(?:[^"]|"")*"$/.test(record);
    if (!quoted && /[,"\r]/.test(record)) {
      invalidRowNumbers.push(index + 1);
      continue;
    }

    const email = quoted ? record.slice(1, -1).replace(/""/g, '"') : record;
    // The demo has a deliberately narrow ASCII address policy.
    if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(normalizeEmail(email))) {
      invalidRowNumbers.push(index + 1);
      continue;
    }

    rows.push({ rowNumber: index + 1, email });
  }

  return { rows, invalidRowNumbers };
}
