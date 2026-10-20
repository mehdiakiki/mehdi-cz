import { deduplicateContacts } from "./deduplicate.ts";
import { parseContactExport } from "./parse-export.ts";
import { renderImportPreview } from "./preview.ts";
import type { DeduplicationResult } from "./types.ts";

export type ImportPreview = {
  result: DeduplicationResult;
  invalidRowNumbers: number[];
  html: string;
};

export function previewContactExport(csv: string): ImportPreview {
  const parsed = parseContactExport(csv);
  const result: DeduplicationResult = deduplicateContacts(parsed.rows);
  return {
    result,
    invalidRowNumbers: parsed.invalidRowNumbers,
    html: renderImportPreview(result),
  };
}
