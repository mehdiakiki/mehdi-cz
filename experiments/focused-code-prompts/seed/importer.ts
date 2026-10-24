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
  // The existing preview is wired up, but duplicate detection is still missing.
  const result: DeduplicationResult = { unique: parsed.rows, duplicates: [] };
  return {
    result,
    invalidRowNumbers: parsed.invalidRowNumbers,
    html: renderImportPreview(result),
  };
}
