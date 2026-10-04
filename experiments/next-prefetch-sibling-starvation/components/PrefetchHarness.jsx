"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const slugs = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];

export function PrefetchHarness() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const count = Math.min(7, Math.max(1, Number(searchParams.get("count")) || 5));
  const routeKind = searchParams.get("route") === "partial" ? "partial" : "static";
  const scenarioValue = searchParams.get("scenario");
  const scenario = new Set([
    "viewport-auto",
    "viewport-full",
    "disabled",
    "imperative",
    "imperative-full",
    "staggered",
  ]).has(scenarioValue)
    ? scenarioValue
    : "viewport-auto";
  const selectedSlugs = slugs.slice(0, count);

  useEffect(() => {
    globalThis.__perf046Prefetch = (slug, full = false) =>
      router.prefetch(`/${routeKind}/${slug}`, full ? { kind: "full" } : undefined);
    setHydrated(true);
    return () => {
      delete globalThis.__perf046Prefetch;
    };
  }, [routeKind, router]);

  function prefetchSiblings(delayMs, full) {
    const prefetchSlug = (slug) =>
      router.prefetch(`/${routeKind}/${slug}`, full ? { kind: "full" } : undefined);
    if (delayMs === 0) {
      selectedSlugs.forEach(prefetchSlug);
      return;
    }
    selectedSlugs.forEach((slug, index) => {
      setTimeout(() => prefetchSlug(slug), delayMs * index);
    });
  }

  const prefetch =
    scenario === "disabled" ||
    scenario === "imperative" ||
    scenario === "imperative-full" ||
    scenario === "staggered"
      ? false
      : scenario === "viewport-full"
        ? true
        : null;

  return (
    <section data-hydrated={hydrated ? "true" : "false"}>
      {(scenario === "imperative" ||
        scenario === "imperative-full" ||
        scenario === "staggered") && (
        <button
          data-prefetch-trigger
          onClick={() =>
            prefetchSiblings(scenario === "staggered" ? 75 : 0, scenario === "imperative-full")
          }
          type="button"
        >
          Prefetch {count} siblings
        </button>
      )}
      <nav aria-label="Sibling routes">
        {selectedSlugs.map((slug) => (
          <Link
            data-prefetch-link={slug}
            href={`/${routeKind}/${slug}`}
            key={slug}
            prefetch={prefetch}
          >
            {slug}
          </Link>
        ))}
      </nav>
    </section>
  );
}
