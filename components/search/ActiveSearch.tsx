"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchDocument } from "../../lib/search-document.mjs";
import { findSearchDocuments } from "../../lib/search-documents-query.mjs";
import { loadSearchDocuments } from "./searchDocuments";

const searchResultsId = "site-search-results";
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function ActiveSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<SearchDocument[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => (documents ? findSearchDocuments(documents, query) : []),
    [documents, query]
  );
  const selectedIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    previouslyFocusedElement.current?.focus();
  }, []);

  const selectDocument = useCallback(
    (document: SearchDocument) => {
      closeSearch();
      router.push(`/${document.path.replace(/^\/+/, "")}`);
    },
    [closeSearch, router]
  );

  useEffect(() => {
    let active = true;

    loadSearchDocuments()
      .then((loadedDocuments) => {
        if (active) setDocuments(loadedDocuments as SearchDocument[]);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-gray-300/50 p-4 pt-[12vh] backdrop-blur backdrop-filter dark:bg-black/50"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeSearch();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Site search"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center gap-3 p-4">
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <label htmlFor="site-search-input" className="sr-only">
            Search the site
          </label>
          <input
            ref={inputRef}
            id="site-search-input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={searchResultsId}
            aria-activedescendant={
              results[selectedIndex] ? `${searchResultsId}-${selectedIndex}` : undefined
            }
            autoComplete="off"
            placeholder="Type a command or search…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) => Math.min(current + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter" && results[selectedIndex]) {
                event.preventDefault();
                selectDocument(results[selectedIndex]);
              }
            }}
            className="h-8 w-full bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder-gray-500"
          />
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="rounded border border-gray-400 px-1.5 text-xs leading-5 font-medium tracking-wide text-gray-500 dark:text-gray-300"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[min(55vh,28rem)] overflow-y-auto border-t border-gray-100 dark:border-gray-800">
          {!documents && !loadError ? (
            <p className="px-4 py-8 text-center text-gray-400 dark:text-gray-600">Loading...</p>
          ) : null}
          {loadError ? (
            <p role="alert" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Search could not be loaded. Close and try again.
            </p>
          ) : null}
          {documents && results.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No results for your search...
            </p>
          ) : null}
          {documents && results.length > 0 ? (
            <ul id={searchResultsId} role="listbox" aria-label="Search results">
              {results.map((document, index) => (
                <li
                  id={`${searchResultsId}-${index}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  key={document.path}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectDocument(document)}
                    className={`block w-full px-4 py-2 text-left ${
                      index === selectedIndex
                        ? "bg-primary-700 text-gray-100"
                        : "bg-transparent text-gray-700 dark:text-gray-100"
                    }`}
                  >
                    <span
                      className={`block text-xs ${
                        index === selectedIndex ? "text-gray-200" : "text-gray-400"
                      }`}
                    >
                      {dateFormatter.format(new Date(document.date))}
                    </span>
                    <span className="block">{document.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
