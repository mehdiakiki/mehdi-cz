"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import siteMetadata from "@/data/siteMetadata";
import ActiveSearch from "@/components/search/ActiveSearch";
import { loadSearchDocuments } from "@/components/search/searchDocuments";

const SearchButton = () => {
  const [requestId, setRequestId] = useState(0);
  const prepareSearch = useCallback(() => {
    // The small search surface ships with the site shell. Intent starts only
    // the large data branch, and allSettled avoids an unhandled speculative
    // request failure before the user opens the dialog.
    void Promise.allSettled([loadSearchDocuments()]);
  }, []);
  const openSearch = useCallback(() => {
    prepareSearch();
    setRequestId((current) => current + 1);
  }, [prepareSearch]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openSearch]);

  if (siteMetadata.search?.provider === "kbar") {
    return (
      <>
        <button
          type="button"
          aria-label="Search"
          onClick={openSearch}
          onFocus={prepareSearch}
          onPointerEnter={prepareSearch}
          onTouchStart={prepareSearch}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="hover:text-primary-700 dark:hover:text-primary-300 h-6 w-6 text-gray-900 dark:text-gray-100"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </button>
        {requestId > 0 ? createPortal(<ActiveSearch key={requestId} />, document.body) : null}
      </>
    );
  }

  return null;
};

export default SearchButton;
