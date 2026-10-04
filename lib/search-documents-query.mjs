export const maximumVisibleSearchResults = 10;

function normalize(value) {
  return value.toLocaleLowerCase("en-US");
}

function rankDocument(document, terms) {
  const title = normalize(document.title);
  const summary = normalize(document.summary || "");
  let score = 0;

  for (const term of terms) {
    const titlePosition = title.indexOf(term);
    const summaryPosition = summary.indexOf(term);

    if (titlePosition === -1 && summaryPosition === -1) {
      return null;
    }

    if (title === term) score += 100;
    else if (titlePosition === 0) score += 60;
    else if (titlePosition > 0) score += 35;
    else score += 10;
  }

  return score;
}

export function findSearchDocuments(documents, query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return documents.slice(0, maximumVisibleSearchResults);
  }

  return documents
    .map((document, index) => ({
      document,
      index,
      score: rankDocument(document, terms),
    }))
    .filter((entry) => entry.score !== null)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, maximumVisibleSearchResults)
    .map((entry) => entry.document);
}
