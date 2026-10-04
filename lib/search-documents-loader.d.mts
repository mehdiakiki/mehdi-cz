export function createSearchDocumentsLoader<SearchDocuments = unknown>(
  searchDocumentsPath: string,
  fetcher?: typeof fetch
): () => Promise<SearchDocuments>;
