export const searchDocumentKeys = ["path", "title", "summary", "date"];

export function toSearchDocument(document) {
  return {
    path: document.path,
    title: document.title,
    summary: document.summary,
    date: document.date,
  };
}
