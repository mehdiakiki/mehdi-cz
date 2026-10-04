/**
 * Create one retryable, promise-cached loader for the generated search index.
 *
 * The stable promise is the coordination primitive: an intent handler can start
 * the request before the search UI mounts, and the eventual provider consumes
 * that exact request instead of issuing another one.
 */
export function createSearchDocumentsLoader(searchDocumentsPath, fetcher = globalThis.fetch) {
  if (!searchDocumentsPath) {
    throw new TypeError("A search documents path is required");
  }

  let documentsPromise;

  return function loadSearchDocuments() {
    if (!documentsPromise) {
      documentsPromise = fetcher(searchDocumentsPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Unable to load search documents (${response.status || "unknown status"})`
            );
          }

          return response.json();
        })
        .catch((error) => {
          // A transient failure must not poison every later search attempt.
          documentsPromise = undefined;
          throw error;
        });
    }

    return documentsPromise;
  };
}
