import documents from "../../../generated/search.json" with { type: "json" };
import { compressedHtmlResponse } from "../../../lib/respond.mjs";
import { findDocuments } from "../../../lib/search.mjs";
import { contentVariants, themeBootstrap } from "../../../lib/render-document.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderSearchPage(query, variant) {
  const results = findDocuments(documents, query);
  const resultMarkup = results
    .map(
      (document) =>
        `<li><a href="/${escapeHtml(document.path).replace(/^\/+/, "")}"><strong>${escapeHtml(document.title)}</strong><span>${escapeHtml(document.summary)}</span></a></li>`
    )
    .join("");
  const status = query
    ? `${results.length} result${results.length === 1 ? "" : "s"} for “${escapeHtml(query)}”`
    : "Recent searchable pages";
  const stylesheet = {
    full: "/generated/full/base.css",
    pruned: "/generated/pruned/home-base.css",
    shared: "/generated/shared/base.css",
    "prerender-immediate": "/generated/shared/base.css",
    "prerender-dwell": "/generated/shared/base.css",
  }[variant];

  return `<!doctype html><html lang="en-us" class="scroll-smooth" data-perf030-variant="${variant}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Search | mehdi.cz</title><link rel="icon" href="/static/favicons/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheet}"><script>${themeBootstrap}</script></head><body class="bg-white text-black antialiased dark:bg-gray-950 dark:text-white"><main class="hybrid-search-page"><a href="/hybrid/${variant}/home">← Mehdi Akiki</a><h1>Search the site</h1><form action="/hybrid/search" method="get"><input type="hidden" name="variant" value="${variant}"><label for="fallback-search">Search terms</label><div><input id="fallback-search" name="q" type="search" value="${escapeHtml(query)}" required autofocus><button type="submit">Search</button></div></form><p aria-live="polite">${status}</p><ul>${resultMarkup}</ul></main></body></html>`;
}

export function GET(request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const requestedVariant = url.searchParams.get("variant");
  const variant = contentVariants.includes(requestedVariant) ? requestedVariant : "pruned";
  return compressedHtmlResponse(request, renderSearchPage(query, variant), {
    "x-robots-tag": "noindex",
  });
}
