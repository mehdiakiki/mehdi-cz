const dialog = document.querySelector("[data-hybrid-search-dialog]");
const input = dialog?.querySelector("input[type=search]");
const resultsRoot = dialog?.querySelector("[data-hybrid-search-results]");
const status = dialog?.querySelector("[data-hybrid-search-status]");
const closeButton = dialog?.querySelector("[data-hybrid-search-close]");
const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
let documentsPromise;
let documents;
let activeIndex = 0;
let returnFocus;

function normalize(value) {
  return String(value || "").toLocaleLowerCase("en-US");
}

function findDocuments(query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return documents.slice(0, 10);
  return documents
    .map((document, index) => {
      const title = normalize(document.title);
      const summary = normalize(document.summary);
      let score = 0;
      for (const term of terms) {
        const titlePosition = title.indexOf(term);
        const summaryPosition = summary.indexOf(term);
        if (titlePosition === -1 && summaryPosition === -1) return null;
        if (title === term) score += 100;
        else if (titlePosition === 0) score += 60;
        else if (titlePosition > 0) score += 35;
        else score += 10;
      }
      return { document, index, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 10)
    .map((entry) => entry.document);
}

function renderResults() {
  const results = findDocuments(input.value);
  activeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
  resultsRoot.replaceChildren();
  status.hidden = results.length > 0;
  status.textContent = results.length ? "" : `No results for “${input.value}”`;

  for (const [index, searchDocument] of results.entries()) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const time = document.createElement("time");
    const title = document.createElement("span");
    button.type = "button";
    button.dataset.path = `/${searchDocument.path.replace(/^\/+/, "")}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === activeIndex));
    button.id = `hybrid-search-result-${index}`;
    time.dateTime = searchDocument.date;
    time.textContent = formatter.format(new Date(searchDocument.date));
    title.textContent = searchDocument.title;
    button.append(time, title);
    button.addEventListener("pointerenter", () => {
      activeIndex = index;
      renderResults();
    });
    button.addEventListener("click", () => (location.href = button.dataset.path));
    item.append(button);
    resultsRoot.append(item);
  }
  input.setAttribute(
    "aria-activedescendant",
    results[activeIndex] ? `hybrid-search-result-${activeIndex}` : ""
  );
}

export function prepare() {
  documentsPromise ||= fetch("/generated/search.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Search index failed: ${response.status}`);
      return response.json();
    })
    .then((loaded) => (documents = loaded));
  return documentsPromise;
}

export async function openSearch(opener) {
  if (!(dialog instanceof HTMLDialogElement)) {
    location.href = opener.href;
    return;
  }
  returnFocus = opener;
  dialog.showModal();
  input.focus();
  status.hidden = false;
  status.textContent = "Loading…";
  try {
    await prepare();
    renderResults();
  } catch {
    status.textContent = "Search could not be loaded. Use the full search page.";
  }
}

input?.addEventListener("input", () => {
  activeIndex = 0;
  if (documents) renderResults();
});
input?.addEventListener("keydown", (event) => {
  const buttons = [...resultsRoot.querySelectorAll("button")];
  if (event.key === "ArrowDown") activeIndex = Math.min(activeIndex + 1, buttons.length - 1);
  else if (event.key === "ArrowUp") activeIndex = Math.max(activeIndex - 1, 0);
  else if (event.key === "Enter" && buttons[activeIndex]) {
    event.preventDefault();
    buttons[activeIndex].click();
    return;
  } else return;
  event.preventDefault();
  buttons.forEach((button, index) =>
    button.setAttribute("aria-selected", String(index === activeIndex))
  );
  input.setAttribute("aria-activedescendant", buttons[activeIndex]?.id || "");
});
closeButton?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog?.addEventListener("close", () => returnFocus?.focus());
