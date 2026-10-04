import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import {
  getRustFailureArea,
  isRustFailureAtlasLaunched,
  rustFailureAreas,
} from "@/data/rust-failure-atlas.mjs";
import {
  getRustFailureFeatureNote,
  getRustFailureRunner,
  isRustFailureErrorCodeCase,
  rustFailureFeaturedLayers,
} from "@/data/rust-failure-tiers.mjs";
import siteMetadata from "@/data/siteMetadata";
import { getVisibleRustFailureEntries } from "lib/rust-failure-atlas";

type PageProps = { params: Promise<{ area: string }> };

const atlasPath = "/rust-failure-atlas";

export const dynamicParams = false;

export function generateStaticParams() {
  return rustFailureAreas.map((area) => ({ area: area.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata | undefined> {
  const { area: areaSlug } = await params;
  const area = getRustFailureArea(areaSlug);
  if (!area) return;

  const path = `${atlasPath}/area/${area.slug}`;
  const title = `${area.label} — Rust Failure Atlas`;

  return {
    title,
    description: area.description,
    alternates: { canonical: path },
    robots: isRustFailureAtlasLaunched()
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description: area.description,
      type: "website",
      url: path,
    },
  };
}

export default async function RustFailureAtlasAreaPage({ params }: PageProps) {
  const { area: areaSlug } = await params;
  const area = getRustFailureArea(areaSlug);
  if (!area) return notFound();

  const entries = getVisibleRustFailureEntries().filter((entry) => entry.area === area.slug);
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const featuredEntries = rustFailureFeaturedLayers.flatMap((layer) =>
    layer.caseIds.flatMap((caseId) => {
      const entry = entriesById.get(caseId);
      return entry?.destinationAvailable ? [entry] : [];
    })
  );
  const fixtureCount = entries.filter((entry) => entry.hasExecutableFixture).length;
  const errorCodeCount = entries.filter((entry) => isRustFailureErrorCodeCase(entry.id)).length;
  const path = `${atlasPath}/area/${area.slug}`;
  const pageUrl = `${siteMetadata.siteUrl}${path}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Rust Failure Atlas", url: `${siteMetadata.siteUrl}${atlasPath}` },
          { name: area.label, url: pageUrl },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${area.label} — Rust Failure Atlas`,
          description: area.description,
          url: pageUrl,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: entries.length,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
          },
        }}
      />

      <header className="max-w-5xl pt-8 pb-12 md:pt-12 md:pb-16">
        <a
          href={atlasPath}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-semibold tracking-[0.16em] uppercase"
        >
          Rust Failure Atlas / failure families
        </a>
        <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          {area.label}
        </h1>
        <p className="mt-7 max-w-4xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          {area.description}
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          This page lists all {entries.length} records in this family. {fixtureCount} of them have a
          failing and a repaired fixture
          {errorCodeCount > 0 ? `, and ${errorCodeCount} are keyed to a compiler error code` : ""}.
          Use the Atlas search to filter by mechanism, first check, or evidence.
        </p>
      </header>

      <nav
        className="border-y border-gray-200 py-8 dark:border-gray-800"
        aria-label="Other failure families"
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
          {rustFailureAreas.map((candidate) => (
            <li key={candidate.slug}>
              {candidate.slug === area.slug ? (
                <span aria-current="page" className="text-gray-950 dark:text-gray-100">
                  {candidate.label}
                </span>
              ) : (
                <a
                  href={`${atlasPath}/area/${candidate.slug}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {candidate.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {featuredEntries.length > 0 && (
        <section
          className="border-b border-gray-200 py-12 md:py-16 dark:border-gray-800"
          aria-labelledby="family-featured-heading"
        >
          <div className="max-w-4xl">
            <h2
              id="family-featured-heading"
              className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              Below the application layer
            </h2>
            <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
              These cases in this family depend on the linker, a native toolchain, the target, a
              Cargo profile, the test harness, or the runtime. They are also featured on the Atlas
              front page.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {featuredEntries.map((entry) => {
              const runner = getRustFailureRunner(entry.id);
              return (
                <li key={entry.id}>
                  <a
                    href={entry.destinationPath}
                    className="hover:border-primary-500 dark:hover:border-primary-500 block h-full rounded-lg border border-gray-200 p-5 dark:border-gray-800"
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
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="py-12 md:py-16" aria-labelledby="family-directory-heading">
        <div className="max-w-4xl">
          <h2
            id="family-directory-heading"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Complete symptom directory
          </h2>
          <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
            Case identifiers and anchors are stable. Records whose page is not published yet are
            listed without a link. Records marked &ldquo;no fixture yet&rdquo; link to an article
            and have no executable fixture.
          </p>
        </div>

        <ol className="mt-8 grid gap-x-8 gap-y-2 border-t border-gray-200 pt-5 text-sm leading-6 lg:grid-cols-2 dark:border-gray-800">
          {entries.map((entry) => (
            <li key={entry.id} id={entry.id.toLocaleLowerCase("en")} className="scroll-mt-24">
              {entry.destinationAvailable ? (
                <a
                  href={entry.destinationPath}
                  className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-primary-600 dark:text-primary-400 font-semibold">
                    {entry.id}
                  </span>{" "}
                  — {entry.symptom}
                  {!entry.hasExecutableFixture && (
                    <span className="ml-2 text-xs font-semibold tracking-[0.08em] text-amber-700 uppercase dark:text-amber-400">
                      No fixture yet
                    </span>
                  )}
                </a>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold">
                    {entry.id}
                  </span>{" "}
                  — {entry.symptom}
                  {!entry.hasExecutableFixture && (
                    <span className="ml-2 text-xs font-semibold tracking-[0.08em] text-amber-700 uppercase dark:text-amber-400">
                      No fixture yet
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-gray-200 py-12 dark:border-gray-800">
        <a
          href={atlasPath}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
        >
          Search the complete Rust Failure Atlas &rarr;
        </a>
      </footer>
    </>
  );
}
