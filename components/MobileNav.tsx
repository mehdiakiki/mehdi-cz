"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const loadMobileNavPanel = () => import("./MobileNavPanel");
const MobileNavPanel = dynamic(loadMobileNavPanel, { ssr: false });

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const preloadNav = () => {
    void loadMobileNavPanel();
  };

  const openNav = () => {
    setHasOpened(true);
    setNavShow(true);
  };

  return (
    <>
      <button
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={navShow}
        onClick={openNav}
        onFocus={preloadNav}
        onPointerEnter={preloadNav}
        onTouchStart={preloadNav}
        className="md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="hover:text-primary-700 dark:hover:text-primary-300 h-8 w-8 text-gray-900 dark:text-gray-100"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {hasOpened ? <MobileNavPanel open={navShow} onClose={() => setNavShow(false)} /> : null}
    </>
  );
};

export default MobileNav;
