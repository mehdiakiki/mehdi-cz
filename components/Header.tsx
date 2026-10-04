"use client";

import { usePathname } from "next/navigation";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks from "@/data/headerNavLinks";
import NavigationIntentLink from "./NavigationIntentLink";
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
      <NavigationIntentLink href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3"></div>
          {typeof siteMetadata.headerTitle === "string" ? (
            <div className="h-6 text-lg font-semibold sm:text-2xl">{siteMetadata.headerTitle}</div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </NavigationIntentLink>
      <div className="flex items-center space-x-4 leading-5 sm:space-x-6">
        <div className="no-scrollbar hidden items-center space-x-4 overflow-x-auto md:flex md:space-x-6">
          {headerNavLinks
            .filter((link) => link.href !== "/")
            .map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <NavigationIntentLink
                  key={link.title}
                  href={link.href}
                  className={`block font-medium ${
                    isActive
                      ? "border-primary-500 text-primary-700 dark:border-primary-400 dark:text-primary-400 border-b-2"
                      : "hover:text-primary-700 dark:hover:text-primary-300 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {link.title}
                </NavigationIntentLink>
              );
            })}
        </div>
        <SearchButton />
        <MobileNav />
      </div>
    </header>
  );
};

export default Header;
