"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import IntentLink from "@/components/IntentLink";
import {
  prepareRustFailureSearch,
  searchRustFailures,
  rustFailureResultPage,
} from "lib/rust-failure-search.mjs";

export interface RustFailureExplorerEntry {
  id: string;
  area: string;
  areaLabel: string;
  symptom: string;
  likelyCause: string;
  firstCheck: string;
  searchTerms: string[];
  evidence: string[];
  destinationPath: string;
  destinationTitle: string;
  destinationAvailable: boolean;
  isPreview: boolean;
  hasExecutableFixture: boolean;
}

export type RustFailureExplorerWireEntry = [
  id: string,
  area: string,
  symptom: string,
  likelyCause: string,
  firstCheck: string,
  searchTerms: string[],
  evidence: string[],
  destinationPath: string,
  destinationTitle: string,
  destinationAvailable: boolean,
  isPreview: boolean,
  hasExecutableFixture?: boolean,
];

export interface RustFailureExplorerWirePayload {
  version: 1;
  entries: RustFailureExplorerWireEntry[];
}

interface RustFailureAtlasExplorerProps {
  areas: Array<{ slug: string; label: string; count: number }>;
  entryCount: number;
  indexPath: string;
  fallbackIndexPath: string;
  areaPathPrefix: string;
  children: ReactNode;
}

type IndexStatus = "idle" | "loading" | "ready" | "error";

const MAX_RENDERED_RESULTS = 40;

const subscribeToLocationSearch = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("atlas-search-change", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("atlas-search-change", onStoreChange);
  };
};

const getLocationSearch = () => window.location.search;
const getServerLocationSearch = () => null;

export default function RustFailureAtlasExplorer({
  areas,
  entryCount,
  indexPath,
  fallbackIndexPath,
  areaPathPrefix,
  children,
}: RustFailureAtlasExplorerProps) {
  const locationSearch = useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearch,
    getServerLocationSearch
  );
  const requestedUrlState = useMemo(() => {
    const params = new URLSearchParams(locationSearch || "");
    const requestedArea = params.get("area");

    return {
      query: params.get("q") || "",
      page: params.get("page") || "1",
      area:
        requestedArea && areas.some((item) => item.slug === requestedArea) ? requestedArea : "all",
    };
  }, [areas, locationSearch]);
  const query = requestedUrlState.query;
  const area = requestedUrlState.area;
  const updateSearch = useCallback(
    (changes: { query?: string; area?: string; page?: number }, push = false) => {
      const url = new URL(window.location.href);
      if (changes.query !== undefined) {
        if (changes.query.trim()) url.searchParams.set("q", changes.query);
        else url.searchParams.delete("q");
      }
      if (changes.area !== undefined) {
        if (changes.area !== "all") url.searchParams.set("area", changes.area);
        else url.searchParams.delete("area");
      }
      if (changes.page && changes.page > 1) url.searchParams.set("page", String(changes.page));
      else url.searchParams.delete("page");
      const path = `${url.pathname}${url.search}${url.hash}`;
      if (push) window.history.pushState({}, "", path);
      else window.history.replaceState({}, "", path);
      window.dispatchEvent(new Event("atlas-search-change"));
    },
    []
  );
  const urlStateReady = locationSearch !== null;
  const [entries, setEntries] = useState<RustFailureExplorerEntry[] | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>("idle");
  const indexRequest = useRef<Promise<RustFailureExplorerEntry[]> | null>(null);

  const parseIndex = useCallback(
    (payload: RustFailureExplorerWirePayload) => {
      if (payload.version !== 1 || !Array.isArray(payload.entries)) {
        throw new Error("Search index response is invalid");
      }

      const areaLabels = new Map(areas.map((item) => [item.slug, item.label]));
      return payload.entries.map(
        ([
          id,
          areaSlug,
          symptom,
          likelyCause,
          firstCheck,
          searchTerms,
          evidence,
          destinationPath,
          destinationTitle,
          destinationAvailable,
          isPreview,
          hasExecutableFixture,
        ]) => ({
          id,
          area: areaSlug,
          areaLabel: areaLabels.get(areaSlug) || areaSlug,
          symptom,
          likelyCause,
          firstCheck,
          searchTerms,
          evidence,
          destinationPath,
          destinationTitle,
          destinationAvailable,
          isPreview,
          hasExecutableFixture: hasExecutableFixture === true,
        })
      );
    },
    [areas]
  );

  const fetchIndex = useCallback(
    async (path: string, compressed: boolean) => {
      const response = await fetch(path, {
        headers: { Accept: compressed ? "application/gzip" : "application/json" },
      });
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);

      if (!compressed) return parseIndex((await response.json()) as RustFailureExplorerWirePayload);
      if (!response.body) throw new Error("Compressed search index response has no body");

      const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
      const payload = (await new Response(stream).json()) as RustFailureExplorerWirePayload;
      return parseIndex(payload);
    },
    [parseIndex]
  );

  const loadIndex = useCallback(() => {
    if (indexRequest.current) return indexRequest.current;

    setIndexStatus("loading");
    const request = (async () => {
      if (typeof DecompressionStream === "undefined") {
        return fetchIndex(fallbackIndexPath, false);
      }

      try {
        return await fetchIndex(indexPath, true);
      } catch {
        return fetchIndex(fallbackIndexPath, false);
      }
    })()
      .then((loadedEntries) => {
        setEntries(loadedEntries);
        setIndexStatus("ready");
        return loadedEntries;
      })
      .catch((error) => {
        indexRequest.current = null;
        setIndexStatus("error");
        throw error;
      });

    indexRequest.current = request;
    return request;
  }, [fallbackIndexPath, fetchIndex, indexPath]);

  const requestIndex = useCallback(() => {
    void loadIndex().catch(() => undefined);
  }, [loadIndex]);

  useEffect(() => {
    if (!urlStateReady) return;
    if (requestedUrlState.query.trim() || requestedUrlState.area !== "all") requestIndex();
  }, [requestIndex, requestedUrlState, urlStateReady]);

  useEffect(() => {
    const redirectLegacyCaseFragment = () => {
      if (!/^#rfa-\d{3}$/i.test(window.location.hash)) return;
      if (!entries) {
        void loadIndex().catch(() => undefined);
        return;
      }

      const requestedCaseId = window.location.hash.slice(1).toLocaleUpperCase("en");
      const entry = entries.find((candidate) => candidate.id === requestedCaseId);
      if (!entry) return;

      window.location.replace(
        `${areaPathPrefix}/${entry.area}#${entry.id.toLocaleLowerCase("en")}`
      );
    };

    redirectLegacyCaseFragment();
    window.addEventListener("hashchange", redirectLegacyCaseFragment);
    return () => window.removeEventListener("hashchange", redirectLegacyCaseFragment);
  }, [areaPathPrefix, entries, loadIndex]);

  const searchIndex = useMemo(() => prepareRustFailureSearch(entries || []), [entries]);
  const filteredEntries = useMemo(
    () => searchRustFailures(searchIndex, { query, area }),
    [area, query, searchIndex]
  );
  const hasActiveFilters = query.trim().length > 0 || area !== "all";
  const results = rustFailureResultPage(
    filteredEntries,
    requestedUrlState.page,
    MAX_RENDERED_RESULTS
  );
  const renderedEntries = results.entries;

  function changePage(page: number) {
    updateSearch({ page }, true);
    const summary = document.getElementById("atlas-search-status");
    summary?.focus({ preventScroll: true });
    summary?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function clearFilters() {
    updateSearch({ query: "", area: "all" });
  }

  return (
    <div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
        <label
          htmlFor="failure-search"
          className="block text-sm font-semibold text-gray-950 dark:text-gray-100"
        >
          Search an error or describe what happened
        </label>
        <input
          id="failure-search"
          type="search"
          value={query}
          onFocus={requestIndex}
          onPointerEnter={requestIndex}
          onChange={(event) => {
            updateSearch({ query: event.target.value });
            requestIndex();
          }}
          placeholder="Try an error code, future not Send, or build script reruns"
          aria-describedby="atlas-search-status"
          className="ring-primary-500 mt-3 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none placeholder:text-gray-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Example searches">
          {[
            ["Future is not Send", "future not Send"],
            ["A task stops moving", "Tokio stalls"],
            ["Build script keeps running", "build script reruns"],
            ["Debug works, release fails", "debug release"],
          ].map(([label, example]) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                updateSearch({ query: example, area: "all" });
                requestIndex();
              }}
              className="hover:border-primary-500 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter by failure family">
          <button
            type="button"
            onClick={() => {
              updateSearch({ area: "all" });
              requestIndex();
            }}
            aria-pressed={area === "all"}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              area === "all"
                ? "border-primary-700 bg-primary-700 text-white"
                : "hover:border-primary-500 hover:text-primary-600 border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
            }`}
          >
            All failures ({entryCount})
          </button>
          {areas.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => {
                updateSearch({ area: item.slug });
                requestIndex();
              }}
              aria-pressed={area === item.slug}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                area === item.slug
                  ? "border-primary-700 bg-primary-700 text-white"
                  : "hover:border-primary-500 hover:text-primary-600 border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-5 text-sm font-semibold"
          >
            Clear search and filters
          </button>
        )}
      </div>

      {!hasActiveFilters ? (
        <>
          <p
            id="atlas-search-status"
            className="mt-6 scroll-mt-24 text-sm text-gray-500 dark:text-gray-400"
            aria-live="polite"
          >
            {indexStatus === "ready"
              ? "Search is ready. Enter a symptom or choose a family."
              : indexStatus === "loading"
                ? "Loading the cases. You can still browse the families below."
                : indexStatus === "error"
                  ? "Search could not load. You can still browse the families below."
                  : "Type an error or choose an example. You can also browse a family below."}
          </p>
          {children}
        </>
      ) : (
        <div aria-busy={indexStatus === "loading"}>
          <p
            id="atlas-search-status"
            className="mt-6 scroll-mt-24 text-sm text-gray-500 dark:text-gray-400"
            aria-live="polite"
            tabIndex={-1}
          >
            {indexStatus === "ready"
              ? results.total
                ? `Showing ${results.start}–${results.end} of ${results.total} matching cases.`
                : "No matching cases."
              : indexStatus === "error"
                ? "The cases could not be loaded."
                : "Loading the cases…"}
          </p>

          {indexStatus === "error" ? (
            <div
              className="mt-5 rounded-lg border border-dashed border-gray-300 p-8 dark:border-gray-700"
              role="alert"
            >
              <p className="font-semibold text-gray-950 dark:text-gray-100">
                Search is temporarily unavailable.
              </p>
              <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                Clear the filters to use the family directories, or retry loading the detailed
                records.
              </p>
              <button
                type="button"
                onClick={requestIndex}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-4 font-semibold"
              >
                Retry loading search data
              </button>
            </div>
          ) : indexStatus === "ready" && renderedEntries.length > 0 ? (
            <>
              <ol
                start={results.start}
                data-atlas-results
                className="mt-4 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800"
              >
                {renderedEntries.map((entry) => (
                  <li
                    key={entry.id}
                    id={entry.id.toLocaleLowerCase("en")}
                    className="scroll-mt-24 py-8"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold tracking-[0.12em] uppercase">
                      <span className="text-primary-600 dark:text-primary-400">{entry.id}</span>
                      <span className="text-gray-500 dark:text-gray-400">{entry.areaLabel}</span>
                      {entry.isPreview && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Local preview
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 max-w-4xl text-2xl leading-9 font-bold tracking-tight text-gray-950 dark:text-gray-100">
                      {entry.destinationAvailable ? (
                        <IntentLink
                          href={entry.destinationPath}
                          className="hover:text-primary-600 dark:hover:text-primary-400"
                          data-umami-event="failure-atlas-case-open"
                          data-umami-event-failure={entry.id}
                        >
                          {entry.symptom}
                        </IntentLink>
                      ) : (
                        entry.symptom
                      )}
                    </h3>

                    <dl className="mt-5 grid gap-5 lg:grid-cols-2">
                      <div>
                        <dt className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                          First check
                        </dt>
                        <dd className="mt-1 leading-7 text-gray-600 dark:text-gray-400">
                          {entry.firstCheck}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                          Possible cause
                        </dt>
                        <dd className="mt-1 leading-7 text-gray-600 dark:text-gray-400">
                          {entry.likelyCause}
                        </dd>
                      </div>
                    </dl>

                    {entry.hasExecutableFixture ? (
                      <div className="mt-5 flex flex-wrap gap-2" aria-label="Evidence included">
                        <span className="bg-primary-50 text-primary-800 dark:bg-primary-950 dark:text-primary-300 rounded-full px-3 py-1 text-xs font-semibold">
                          Failing and repaired fixture
                        </span>
                        {entry.evidence.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm leading-6 text-gray-600 dark:text-gray-400">
                        No executable fixture exists for this record yet.
                      </p>
                    )}

                    {entry.destinationAvailable ? (
                      <IntentLink
                        href={entry.destinationPath}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-5 inline-block font-semibold"
                        data-umami-event="failure-atlas-case-open"
                        data-umami-event-failure={entry.id}
                      >
                        {entry.hasExecutableFixture
                          ? "Read the reproduction and repair"
                          : "Read the article"}
                        : {entry.destinationTitle} &rarr;
                      </IntentLink>
                    ) : (
                      <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Not published yet: {entry.destinationTitle}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {results.pageCount > 1 && (
                <nav
                  aria-label="Search result pages"
                  className="mt-6 flex flex-wrap items-center justify-between gap-4"
                >
                  <button
                    type="button"
                    disabled={results.page === 1}
                    onClick={() => changePage(results.page - 1)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                  >
                    Previous page
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400" aria-current="page">
                    Page {results.page} of {results.pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={results.page === results.pageCount}
                    onClick={() => changePage(results.page + 1)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                  >
                    Next page
                  </button>
                </nav>
              )}
            </>
          ) : indexStatus === "ready" ? (
            <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-8 dark:border-gray-700">
              <p className="font-semibold text-gray-950 dark:text-gray-100">
                No matching case yet.
              </p>
              <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                Try the first line of the error, an error code, or a few words about the symptom.
                You can also clear the search and browse a family.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-4 font-semibold"
              >
                Show the complete directory
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
