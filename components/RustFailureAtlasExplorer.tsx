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
  return () => window.removeEventListener("popstate", onStoreChange);
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
      area:
        requestedArea && areas.some((item) => item.slug === requestedArea) ? requestedArea : "all",
    };
  }, [areas, locationSearch]);
  const [queryOverride, setQuery] = useState<string | null>(null);
  const [areaOverride, setArea] = useState<string | null>(null);
  const query = queryOverride ?? requestedUrlState.query;
  const area = areaOverride ?? requestedUrlState.area;
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

  useEffect(() => {
    if (!urlStateReady) return;

    const url = new URL(window.location.href);
    const normalizedQuery = query.trim();

    if (normalizedQuery) url.searchParams.set("q", normalizedQuery);
    else url.searchParams.delete("q");

    if (area !== "all") url.searchParams.set("area", area);
    else url.searchParams.delete("area");

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [area, query, urlStateReady]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    const queryTokens = query.trim().toLocaleLowerCase("en").split(/\s+/).filter(Boolean);

    return entries.filter((entry) => {
      if (area !== "all" && entry.area !== area) return false;
      if (queryTokens.length === 0) return true;

      const searchableText = [
        entry.id,
        entry.areaLabel,
        entry.symptom,
        entry.likelyCause,
        entry.firstCheck,
        entry.destinationTitle,
        ...entry.searchTerms,
        ...entry.evidence,
      ]
        .join(" ")
        .toLocaleLowerCase("en");

      return queryTokens.every((token) => searchableText.includes(token));
    });
  }, [area, entries, query]);

  const hasActiveFilters = query.trim().length > 0 || area !== "all";
  const renderedEntries = filteredEntries.slice(0, MAX_RENDERED_RESULTS);

  function clearFilters() {
    setQuery("");
    setArea("all");
  }

  return (
    <div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
        <label
          htmlFor="failure-search"
          className="block text-sm font-semibold text-gray-950 dark:text-gray-100"
        >
          Search the symptom you can observe
        </label>
        <input
          id="failure-search"
          type="search"
          value={query}
          onFocus={requestIndex}
          onPointerEnter={requestIndex}
          onChange={(event) => {
            setQuery(event.target.value);
            requestIndex();
          }}
          placeholder="For example: future not Send, build reruns, open64, task stalls"
          aria-describedby="atlas-search-status"
          className="ring-primary-500 mt-3 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none placeholder:text-gray-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter by failure family">
          <button
            type="button"
            onClick={() => {
              setArea("all");
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
                setArea(item.slug);
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
              ? "Detailed search data is ready. Enter a symptom or choose a family."
              : indexStatus === "loading"
                ? "Preparing detailed search data. The complete directory remains available below."
                : indexStatus === "error"
                  ? "Detailed search data could not load. The complete directory remains available below."
                  : "Browse the failure families below, or search to load the detailed records."}
          </p>
          {children}
        </>
      ) : (
        <div aria-busy={indexStatus === "loading"}>
          <p
            id="atlas-search-status"
            className="mt-6 scroll-mt-24 text-sm text-gray-500 dark:text-gray-400"
            aria-live="polite"
          >
            {indexStatus === "ready"
              ? `Showing ${renderedEntries.length} of ${filteredEntries.length} matching records${
                  filteredEntries.length > MAX_RENDERED_RESULTS
                    ? `. Refine the search to see beyond the first ${MAX_RENDERED_RESULTS}.`
                    : "."
                }`
              : indexStatus === "error"
                ? "Detailed search data could not be loaded."
                : "Loading detailed failure records…"}
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
            <ol className="mt-4 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
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
                    {entry.symptom}
                  </h3>

                  <dl className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div>
                      <dt className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                        Likely mechanism
                      </dt>
                      <dd className="mt-1 leading-7 text-gray-600 dark:text-gray-400">
                        {entry.likelyCause}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                        First discriminating check
                      </dt>
                      <dd className="mt-1 leading-7 text-gray-600 dark:text-gray-400">
                        {entry.firstCheck}
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
          ) : indexStatus === "ready" ? (
            <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-8 dark:border-gray-700">
              <p className="font-semibold text-gray-950 dark:text-gray-100">
                No matching case yet.
              </p>
              <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                Try the exact compiler or linker phrase, the affected target, or a shorter mechanism
                such as cancellation, feature, span, or provenance.
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
