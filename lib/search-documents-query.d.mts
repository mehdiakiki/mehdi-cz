import type { SearchDocument } from "./search-document.mjs";

export const maximumVisibleSearchResults: 10;
export function findSearchDocuments(documents: SearchDocument[], query: string): SearchDocument[];
