"use client";

import { usePathname } from "next/navigation";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks from "@/data/headerNavLinks";
import Link from "./Link";
import MobileNav from "./MobileNav";
import SearchButton from "./SearchButton";

const Header = () => {
  const pathname = usePathname();
  let headerClass = "flex items-center w-full bg-white dark:bg-gray-950 justify-between py-10";
  if (siteMetadata.stickyNav) {
    headerClass += " sticky top-0 z-50";
  }

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3"></div>
          {typeof siteMetadata.headerTitle === "string" ? (
            <div className="hidden h-6 text-2xl font-semibold sm:block">
              {siteMetadata.headerTitle}
            </div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </Link>
      <div className="flex items-center space-x-4 leading-5 sm:space-x-6">
        <div className="no-scrollbar hidden max-w-40 items-center space-x-4 overflow-x-auto sm:flex sm:space-x-6 md:max-w-72 lg:max-w-96">
          {headerNavLinks
            .filter((link) => link.href !== "/")
            .map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const isHire = link.href === "/hire";

              return (
                <Link
                  key={link.title}
                  href={link.href}
                  className={`block font-medium ${
                    isHire
                      ? `font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 ${isActive ? "border-b-2 border-green-600 dark:border-green-400" : ""}`
                      : isActive
                        ? "border-b-2 border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400"
                        : "text-gray-900 hover:text-primary-500 dark:text-gray-100 dark:hover:text-primary-400"
                  }`}
                >
                  {link.title}
                </Link>
              );
            })}
        </div>
        <a
          href="https://cal.com/mehdicz/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 sm:block"
        >
          Book a Call
        </a>
        <SearchButton />
        <MobileNav />
      </div>
    </header>
  );
};

export default Header;
