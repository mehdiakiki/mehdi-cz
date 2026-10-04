export interface SearchDocumentSource {
  path: string;
  title: string;
  summary: string;
  date: string;
}

export interface SearchDocument {
  path: string;
  title: string;
  summary: string;
  date: string;
}

export const searchDocumentKeys: readonly (keyof SearchDocument)[];

export function toSearchDocument(document: SearchDocumentSource): SearchDocument;
