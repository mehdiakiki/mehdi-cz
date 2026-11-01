const fillerWords = new Set([
  "a", "an", "the", "i", "my", "why", "how", "do", "does", "is", "are", "was", "were",
  "it", "this", "that", "to", "of", "in", "on", "at", "with", "and", "or", "for", "as",
  "from", "by", "be", "been", "can", "error", "warning", "note", "help",
]);

function normalized(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replaceAll("’", "'")
    .replace(/\bcannot be (?:sent|transferred)(?: between threads safely)?\b/g, "not send")
    .replace(/\bcannot be shared(?: between threads safely)?\b/g, "not sync")
    .replace(/\bcannot be unpinned\b/g, "not unpin")
    .replace(/(?:!\s*|\bnon[\s`-]*)(send|sync|unpin)\b/g, "not $1")
    .replace(/\b(?:cannot|can't|isn't|doesn't|couldn't)\b/g, "not")
    .replace(/[^a-z0-9_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function diagnosticText(query) {
  const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
  const clean = query.replace(ansi, "");
  const lines = clean.split(/\r?\n/).map((line) => line.split("-->")[0]);
  const headings = lines.filter((line) => /^\s*error(?:\[E\d{4}\])?:/i.test(line));
  // A pasted diagnostic's source paths, line numbers, and carets are context,
  // not requirements that every matching case must contain.
  return headings.length ? headings.join(" ") : lines.join(" ");
}

export function prepareRustFailureSearch(entries) {
  return entries.map((entry, order) => {
    const fields = [
      [entry.symptom, 100],
      [entry.destinationTitle || "", 80],
      [(entry.searchTerms || []).join(" "), 70],
      [entry.likelyCause || "", 25],
      [entry.firstCheck || "", 15],
      [(entry.evidence || []).join(" "), 5],
      [entry.areaLabel || "", 5],
    ].map(([text, weight]) => {
      const value = normalized(text);
      return { value, words: new Set(value.split(" ")), weight };
    });
    const all = fields.map((field) => field.value).join(" ");
    return { entry, order, fields, all, codes: new Set(all.match(/\be\d{4}\b/g) || []) };
  });
}

export function searchRustFailures(index, { query = "", area = "all" } = {}) {
  const text = diagnosticText(query);
  const ids = [...text.matchAll(/\brfa[-_\s]?(\d{1,3})\b/gi)].map(
    (match) => `RFA-${match[1].padStart(3, "0")}`
  );
  const value = normalized(text);
  const codes = [...new Set(value.match(/\be\d{4}\b/g) || [])];
  const tokens = [...new Set(value.split(" "))].filter(
    (token) => token && !fillerWords.has(token) && !codes.includes(token)
  );
  const negativeTraits = [...value.matchAll(/\bnot (send|sync|unpin)\b/g)].map(
    (match) => match[0]
  );
  const matches = [];
  for (const record of index) {
    if (area !== "all" && record.entry.area !== area) continue;
    if (ids.length) {
      if (ids.includes(record.entry.id)) matches.push({ ...record, score: 10000 });
      continue;
    }
    if (!codes.every((code) => record.codes.has(code))) continue;
    if (!negativeTraits.every((trait) => record.fields.some((field) => ` ${field.value} `.includes(` ${trait} `)))) continue;
    let score = codes.length * 400;
    const complete = tokens.every((token) => {
      let weight = 0;
      for (const field of record.fields) {
        if (field.words.has(token)) weight = Math.max(weight, field.weight);
        else if (token.length >= 3 && [...field.words].some((word) => word.startsWith(token))) {
          weight = Math.max(weight, field.weight / 2);
        }
      }
      score += weight;
      return weight > 0;
    });
    if (!complete) continue;
    if (tokens.length > 1) {
      const phrase = tokens.join(" ");
      for (const field of record.fields) {
        if (field.value.includes(phrase)) score += field.weight * 2;
      }
    }
    matches.push({ entry: record.entry, order: record.order, score });
  }
  return matches.sort((a, b) => b.score - a.score || a.order - b.order).map((item) => item.entry);
}

export function rustFailureResultPage(entries, requestedPage, pageSize = 40) {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 40;
  const pageCount = Math.max(1, Math.ceil(entries.length / size));
  const requested = Number(requestedPage);
  const page = Number.isSafeInteger(requested) && requested > 0
    ? Math.min(requested, pageCount)
    : 1;
  const offset = (page - 1) * size;
  return {
    entries: entries.slice(offset, offset + size),
    page,
    pageCount,
    total: entries.length,
    start: entries.length ? offset + 1 : 0,
    end: Math.min(offset + size, entries.length),
  };
}
