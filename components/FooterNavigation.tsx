"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, type SyntheticEvent } from "react";
import siteMetadata from "@/data/siteMetadata";

const footerLinks = [
  { href: "/work", title: "Work" },
  { href: "/open-source", title: "Open Source" },
  { href: "/blog", title: "Writing" },
  { href: "/rust-failure-atlas", title: "Rust Failure Atlas" },
  { href: "/notes", title: "Notes" },
  { href: "/about", title: "About" },
  { href: "/contact", title: "Contact" },
] as const;

export default function FooterNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedHrefs = useRef(new Set<string>());

  const prefetchFromIntent = (event: SyntheticEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>("a[data-prefetch-on-intent]");
    if (!link || !event.currentTarget.contains(link)) return;

    const href = link.getAttribute("href");
    if (!href || href.split(/[?#]/, 1)[0] === pathname || prefetchedHrefs.current.has(href)) return;

    prefetchedHrefs.current.add(href);
    router.prefetch(href);
  };

  const intentHandlers = {
    onMouseOver: prefetchFromIntent,
    onFocus: prefetchFromIntent,
    onTouchStart: prefetchFromIntent,
  };

  return (
    <>
      <nav
        {...intentHandlers}
        aria-label="Footer navigation"
        className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium"
      >
        {footerLinks.map((link) => (
          <Link key={link.href} href={link.href} prefetch={false} data-prefetch-on-intent>
            {link.title}
          </Link>
        ))}
      </nav>
      <div
        {...intentHandlers}
        className="mb-2 flex space-x-2 text-sm text-gray-500 dark:text-gray-400"
      >
        <div>{siteMetadata.author}</div>
        <div>{` • `}</div>
        <div>{`© ${new Date().getFullYear()}`}</div>
        <div>{` • `}</div>
        <Link href="/" prefetch={false} data-prefetch-on-intent>
          {siteMetadata.title}
        </Link>
      </div>
    </>
  );
}
