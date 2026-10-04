"use client";

import { useEffect, useRef } from "react";

interface DeferredStylesheetProps {
  href: string;
  marker: string;
  promoterSrc: string;
}

/**
 * Fetch a rare, below-the-fold stylesheet without blocking first paint, then
 * apply it once loaded. The startup script closes the pre-hydration window;
 * this effect also covers client navigation. The noscript link is deliberately
 * eager so the enhancement never makes CSS depend on JavaScript.
 */
export default function DeferredStylesheet({ href, marker, promoterSrc }: DeferredStylesheetProps) {
  const stylesheetRef = useRef<HTMLLinkElement>(null);

  useEffect(() => {
    const stylesheet = stylesheetRef.current;
    if (!stylesheet) return;

    const promote = () => {
      stylesheet.media = "all";
    };
    if (stylesheet.sheet) {
      promote();
      return;
    }
    stylesheet.addEventListener("load", promote, { once: true });
    return () => stylesheet.removeEventListener("load", promote);
  }, []);

  return (
    <>
      <link
        ref={stylesheetRef}
        rel="stylesheet"
        href={href}
        media="print"
        data-article-style={marker}
      />
      <script async src={promoterSrc} data-article-style-promoter={marker} />
      <noscript>
        <link rel="stylesheet" href={href} data-article-style={`${marker}-noscript`} />
      </noscript>
    </>
  );
}
