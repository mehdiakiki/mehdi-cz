import type { Metadata } from "next";
import { allBlogs } from "contentlayer/generated";

import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import Link from "@/components/Link";
import RustFailureAtlasExplorer from "@/components/RustFailureAtlasExplorer";
import RustDiagnosticPaths from "@/components/RustDiagnosticPaths";
import { availableRustDiagnosticPaths } from "@/data/rust-diagnostic-paths.mjs";
import { isRustFailureAtlasLaunched, rustFailureAreas } from "@/data/rust-failure-atlas.mjs";
import {
  getRustFailureFeatureNote,
  getRustFailureRunner,
  getRustFailureTier,
  isRustFailureErrorCodeCase,
  rustFailureFeaturedLayers,
  rustFailureSystemsRunners,
} from "@/data/rust-failure-tiers.mjs";
import { rustFailureTrails } from "@/data/rust-failure-trails.mjs";
import siteMetadata from "@/data/siteMetadata";
import { getVisibleRustFailureEntries } from "lib/rust-failure-atlas";

const pagePath = "/rust-failure-atlas";
const pageUrl = `${siteMetadata.siteUrl}${pagePath}`;

export function generateMetadata(): Metadata {
  const title = "Rust Failure Atlas: Symptom, Cause, Reproduction, Repair";
  const description =
    "A symptom-first field guide to Rust failures that depend on async boundaries, Cargo graphs, targets, linkers, memory invariants, and compiler versions.";

  return {
    title,
    description,
    alternates: { canonical: pagePath },
    robots: isRustFailureAtlasLaunched()
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description:
        "Diagnose difficult Rust failures from the evidence you can observe, then reproduce the mechanism and verify the repair.",
      type: "website",
      url: pagePath,
    },
  };
}

const method = [
  {
    number: "01",
    title: "Begin with the symptom",
    description:
      "Keep the exact error and note what changed: Rust version, target, profile, or when the failure happens.",
  },
  {
    number: "02",
    title: "Separate the possible causes",
    description:
      "Choose a check whose result changes what you investigate next. A build failure may come from the Rust code, the linker, or a missing library.",
  },
  {
    number: "03",
    title: "Check the repair",
    description:
      "Compare the failing example with the repaired one. Check what changed and what the result establishes. The explanation connects that result to the sources.",
  },
];

const inclusionChecks = [
  "Exact toolchain, target, profile, and dependency context",
  "Small reproduction or controlled interleaving",
  "Likely cause separated from confirmed cause",
  "A repair with a regression check",
  "Primary documentation or upstream implementation source",
  "A review date when version-sensitive behavior matters",
];

interface VisibleArea {
  slug: string;
  label: string;
  description: string;
  count: number;
  path: string;
}

function RustFailureAtlasDirectory({ areas }: { areas: VisibleArea[] }) {
  return (
    <nav id="atlas-directory" className="mt-8" aria-labelledby="atlas-directory-heading">
      <div className="max-w-4xl">
        <h3
          id="atlas-directory-heading"
          className="text-xl font-bold text-gray-950 dark:text-gray-100"
        >
          Browse by failure family
        </h3>
        <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
          Choose a family to browse its cases. Each case starts with a symptom and a first check.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {areas.map((area) => (
          <li key={area.slug}>
            <a
              href={area.path}
              className="hover:border-primary-500 dark:hover:border-primary-500 block h-full rounded-lg border border-gray-200 p-5 dark:border-gray-800"
            >
              <span className="block text-lg font-bold text-gray-950 dark:text-gray-100">
                {area.label} ({area.count})
              </span>
              <span className="mt-2 block text-sm leading-6 text-gray-600 dark:text-gray-400">
                {area.description}
              </span>
              <span className="text-primary-600 dark:text-primary-400 mt-4 block text-sm font-semibold">
                Open the family list &rarr;
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function RustFailureAtlasPage() {
  const entries = getVisibleRustFailureEntries();
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const fixtureCount = entries.filter((entry) => entry.hasExecutableFixture).length;
  const withoutFixtureCount = entries.length - fixtureCount;
  const featuredLayers = rustFailureFeaturedLayers.flatMap((layer) => {
    const layerEntries = layer.caseIds.flatMap((caseId) => {
      const entry = entriesById.get(caseId);
      return entry?.destinationAvailable ? [entry] : [];
    });
    return layerEntries.length > 0 ? [{ ...layer, entries: layerEntries }] : [];
  });
  const featuredEntries = featuredLayers.flatMap((layer) => layer.entries);
  const systemsRunners = new Set<string>(rustFailureSystemsRunners);
  const featuredWithSystemsFixtureCount = featuredEntries.filter((entry) => {
    const runner = getRustFailureRunner(entry.id);
    return runner ? systemsRunners.has(runner.id) : false;
  }).length;
  const referenceEntries = entries.filter((entry) => getRustFailureTier(entry.id) === "reference");
  const referenceErrorCodeCount = referenceEntries.filter((entry) =>
    isRustFailureErrorCodeCase(entry.id)
  ).length;
  const visibleAreas = rustFailureAreas.flatMap((area) => {
    const count = entries.filter((entry) => entry.area === area.slug).length;
    return count > 0
      ? [
          {
            slug: area.slug,
            label: area.label,
            description: area.description,
            count,
            path: `${pagePath}/area/${area.slug}`,
          },
        ]
      : [];
  });

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Rust Failure Atlas", url: pageUrl },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Rust Failure Atlas",
          description:
            "A symptom-first collection of reproduced Rust compiler, async, Cargo, linker, target, FFI, and memory failures.",
          url: pageUrl,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: entries.length,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
          },
        }}
      />

      <header className="max-w-5xl pt-8 pb-6 md:pt-12 md:pb-8">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          A practical Rust reference
        </p>
        <h1 className="mt-3 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Rust Failure Atlas
        </h1>
        <p className="mt-7 max-w-4xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          Your build fails only in release. A task stops making progress. A library works on one
          machine but fails on another. Start with the error or the symptom, then follow a check
          that can narrow the cause.
        </p>
      </header>

      <section className="pt-2 pb-10 md:pb-14" aria-labelledby="atlas-cases">
        <div className="max-w-4xl">
          <h2
            id="atlas-cases"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Find your failure
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Paste the first error line or describe what you see. If several causes fit, use the first
            check to tell them apart.
          </p>
        </div>
        <div className="mt-8">
          <RustFailureAtlasExplorer
            areas={visibleAreas}
            entryCount={entries.length}
            indexPath="/rust-failure-atlas/search-index.json.gz"
            fallbackIndexPath="/rust-failure-atlas/search-index"
            areaPathPrefix="/rust-failure-atlas/area"
          >
            <RustFailureAtlasDirectory areas={visibleAreas} />
          </RustFailureAtlasExplorer>
        </div>
      </section>

      <section
        className="grid gap-6 border-y border-gray-200 py-8 sm:grid-cols-3 dark:border-gray-800"
        aria-label="Current Atlas evidence"
      >
        <div>
          <p className="text-3xl font-bold text-gray-950 dark:text-gray-100">{entries.length}</p>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            symptom-first records
          </p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-950 dark:text-gray-100">{fixtureCount}</p>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            records with a downloadable failing and repaired fixture
            {withoutFixtureCount > 0
              ? `; ${withoutFixtureCount} link to articles without an executable fixture yet`
              : ""}
          </p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-950 dark:text-gray-100">
            {rustFailureTrails.length}
          </p>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            mechanism trails connecting related failures
          </p>
        </div>
      </section>

      <RustDiagnosticPaths paths={availableRustDiagnosticPaths(allBlogs, entries)} />

      {featuredLayers.length > 0 && (
        <section className="py-16 md:py-20" aria-labelledby="atlas-featured">
          <div className="max-w-4xl">
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
              Below the application layer
            </p>
            <h2
              id="atlas-featured"
              className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              Linkers, native libraries, targets, and runtimes
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">
              These {featuredEntries.length} cases depend on more than the source file: the final
              link, a symbol table, a C toolchain, the target triple, the allocator on the other
              side of an FFI call, a Cargo profile, or the test harness. For{" "}
              {featuredWithSystemsFixtureCount} of them the fixture goes past a single compiler run:
              nm and readelf, a link map, a linker under a memory cap, a C host built with
              AddressSanitizer, paired Cargo profiles, or a subprocess deadline.
            </p>
          </div>

          <div className="mt-12 space-y-12">
            {featuredLayers.map((layer) => (
              <section key={layer.slug} aria-labelledby={`featured-${layer.slug}`}>
                <div className="max-w-3xl">
                  <h3
                    id={`featured-${layer.slug}`}
                    className="text-xl font-bold text-gray-950 dark:text-gray-100"
                  >
                    {layer.label}
                  </h3>
                  <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                    {layer.description}
                  </p>
                </div>
                <ul className="mt-5 grid gap-4 md:grid-cols-2">
                  {layer.entries.map((entry) => {
                    const runner = getRustFailureRunner(entry.id);
                    return (
                      <li key={entry.id}>
                        <Link
                          href={entry.destinationPath}
                          prefetch={false}
                          className="hover:border-primary-500 dark:hover:border-primary-500 block h-full rounded-lg border border-gray-200 p-5 dark:border-gray-800"
                          data-umami-event="failure-atlas-featured-open"
                          data-umami-event-failure={entry.id}
                          data-umami-event-layer={layer.slug}
                        >
                          <span className="block text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase dark:text-gray-400">
                            {entry.id}
                            {runner ? ` · ${runner.label}` : ""}
                          </span>
                          <span className="mt-2 block leading-6 font-semibold text-gray-950 dark:text-gray-100">
                            {entry.destinationTitle}
                          </span>
                          <span className="mt-2 block text-sm leading-6 text-gray-600 dark:text-gray-400">
                            {getRustFailureFeatureNote(entry.id)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}

      <section
        className="grid gap-5 border-y border-gray-200 py-10 md:grid-cols-3 dark:border-gray-800"
        aria-label="Atlas method"
      >
        {method.map((item) => (
          <div key={item.number}>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
              {item.number}
            </p>
            <h2 className="mt-3 text-xl font-bold text-gray-950 dark:text-gray-100">
              {item.title}
            </h2>
            <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{item.description}</p>
          </div>
        ))}
      </section>



      <section
        className="border-y border-gray-200 py-16 dark:border-gray-800"
        aria-labelledby="atlas-standard"
      >
        <div className="max-w-4xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            Inclusion standard
          </p>
          <h2
            id="atlas-standard"
            className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            A plausible explanation is not yet a case file
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">
            I include a failure when I can state the symptom without pretending it has only one
            cause, show a minimal or controlled reproduction, identify at least one misleading
            shortcut, and connect the repair to evidence that would fail again if the mechanism
            returned.
          </p>
          <p className="mt-4 leading-7 text-gray-600 dark:text-gray-400">
            A fixture run shows two things: the failing project fails with the recorded output, and
            the repaired project passes. It does not check the written explanation, which is my
            reading of the mechanism with primary sources cited on each case page.
            {withoutFixtureCount > 0
              ? ` ${withoutFixtureCount} records link to long-form articles instead of case pages. They do not have an executable fixture yet, and search results say so.`
              : ""}
          </p>
          <ul className="mt-6 grid gap-3 text-gray-600 sm:grid-cols-2 dark:text-gray-400">
            {inclusionChecks.map((item) => (
              <li key={item} className="border-primary-500 border-l-2 pl-4 leading-7">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="atlas-boundary">
        <div className="max-w-4xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            Reference layer
          </p>
          <h2
            id="atlas-boundary"
            className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Compiler diagnostics and library contracts
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-300">
            The other {referenceEntries.length} records are the reference layer. Most of them start
            from a compiler diagnostic or a documented standard library contract, where the cause is
            closer to the code you wrote: borrow and trait errors, macro and type diagnostics,
            collection and I/O behavior, numeric edge cases, and edition changes.{" "}
            {referenceErrorCodeCount} of them are keyed to a compiler error code. All of them stay
            in search and on their family pages.
          </p>
          <p className="mt-5 leading-7 text-gray-600 dark:text-gray-400">
            A case belongs in the atlas when copying the final fix without understanding the
            mechanism is likely to make the failure return in another target, task, dependency, or
            release. For language concepts without a failure symptom, use the Rust Under the Hood
            series. For a compiler error code on its own, the official Rust error-code index is
            usually the faster reference.
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href="/blog/topics/rust-under-the-hood"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            >
              Browse Rust Under the Hood &rarr;
            </Link>
            <Link
              href="https://doc.rust-lang.org/stable/error_codes/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            >
              Open the official error-code index &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 py-16 dark:border-gray-800">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Add evidence, not noise
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
          Have a Rust failure that disappears when simplified?
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
          Send the smallest evidence you still trust: the symptom, versions, target, profile, and
          what makes it appear or disappear. A useful report can become an Atlas case without
          exposing private source code.
        </p>
        <Link
          href="/contact"
          className="bg-primary-700 hover:bg-primary-800 mt-7 inline-block rounded-md px-5 py-3 font-semibold text-white"
          data-umami-event="failure-atlas-contact"
        >
          Share a reproducible symptom
        </Link>
      </section>
    </>
  );
}
