import "css/prism.css";
import "katex/dist/katex.css";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXLayoutRenderer } from "pliny/mdx-components";

import { components } from "@/components/MDXComponents";
import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import Link from "@/components/Link";
import PageTitle from "@/components/PageTitle";
import ScrollTopAndComment from "@/components/ScrollTopAndComment";
import SectionContainer from "@/components/SectionContainer";
import { getRustAtlasGrowthCohort } from "@/data/rust-atlas-growth-experiments.mjs";
import { getRustFailureEvidence, rustFailureEvidenceUrl } from "@/data/rust-failure-evidence.mjs";
import { getRustFailureArea, rustFailureAtlasEntries } from "@/data/rust-failure-atlas.mjs";
import { canonicalRustFailureCaseId } from "@/data/rust-failure-intent-review.mjs";
import { getRelatedRustFailureIds, getRustFailureTrails } from "@/data/rust-failure-trails.mjs";
import siteMetadata from "@/data/siteMetadata";
import { allRustFailures, type RustFailure } from "contentlayer/generated";
import { filterVisiblePosts, publicationStatus } from "lib/publication.mjs";
import { selectPrerenderEntries } from "lib/prerender-budget.mjs";

const displayDate: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const dynamicParams = true;
export const revalidate = false;

function visibleCases() {
  return filterVisiblePosts<RustFailure>(allRustFailures);
}

function primarySourceLabel(source: string) {
  const url = new URL(source);
  const errorCode = url.pathname.match(/\/error_codes\/(E\d+)\.html$/)?.[1];
  if (errorCode) return `Official Rust error index: ${errorCode}`;

  const method = url.hash.match(/^#method\.(.+)$/)?.[1];
  if (method) return `Official API documentation: ${method.replaceAll("_", " ")}`;

  const crateName = url.hostname === "docs.rs" ? url.pathname.split("/").filter(Boolean)[0] : "";
  if (crateName) return `Official ${crateName} crate documentation`;

  const page = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || "Rust").replace(
    /[-_.]+/g,
    " "
  );
  return `Official Rust documentation: ${page}`;
}

export function generateStaticParams() {
  return selectPrerenderEntries(visibleCases()).map((failure) => ({ slug: failure.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata | undefined> {
  const { slug } = await params;
  const failure = visibleCases().find((candidate) => candidate.slug === decodeURI(slug));
  if (!failure) return;

  const path = `/rust/failures/${failure.slug}`;
  const canonicalCaseId = canonicalRustFailureCaseId(failure.caseId);
  const canonicalEntry = rustFailureAtlasEntries.find((entry) => entry.id === canonicalCaseId);
  const canonicalPath = canonicalEntry?.caseSlug
    ? `/rust/failures/${canonicalEntry.caseSlug}`
    : path;
  const isCanonical = canonicalCaseId === failure.caseId;
  return {
    title: failure.title,
    description: failure.summary,
    alternates: { canonical: canonicalPath },
    robots: isCanonical ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: failure.title,
      description: failure.summary,
      type: "article",
      url: canonicalPath,
      publishedTime: new Date(failure.date).toISOString(),
      modifiedTime: new Date(failure.lastmod || failure.date).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: failure.title,
      description: failure.summary,
    },
  };
}

export default async function RustFailurePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cases = visibleCases();
  const failure = cases.find((candidate) => candidate.slug === decodeURI(slug));
  if (!failure) return notFound();

  const area = getRustFailureArea(failure.area);
  if (!area) return notFound();

  const executableEvidence = getRustFailureEvidence(failure.caseId);
  const growthCohort = getRustAtlasGrowthCohort(failure.caseId);
  const evidenceRunner: string | undefined = executableEvidence?.runner;
  const evidenceLabel =
    evidenceRunner === "cargo"
      ? "Cargo workspace evidence"
      : evidenceRunner === "cargo-rebuild"
        ? "Cargo rebuild evidence"
        : evidenceRunner === "cargo-runtime-env"
          ? "Cargo runtime-boundary evidence"
          : evidenceRunner === "cargo-package"
            ? "Cargo package-boundary evidence"
            : evidenceRunner === "cargo-profile-pair"
              ? "Cargo profile-pair evidence"
              : evidenceRunner === "cargo-test-surfaces"
                ? "Cargo test-surface evidence"
                : evidenceRunner === "cargo-suite-isolation"
                  ? "Cargo suite-isolation evidence"
                  : evidenceRunner === "cargo-subprocess"
                    ? "Cargo deadline-isolated evidence"
                    : evidenceRunner === "rustc-run"
                      ? "Runtime evidence"
                      : evidenceRunner === "rustc-link"
                        ? "Linker evidence"
                        : evidenceRunner === "rustc-symbol-matrix"
                          ? "Native symbol-matrix evidence"
                          : evidenceRunner === "rustc-native-target-matrix"
                            ? "Native target-matrix evidence"
                            : evidenceRunner === "rustc-native-discovery"
                              ? "Native discovery evidence"
                              : evidenceRunner === "rustc-native-owner"
                                ? "Native ownership evidence"
                                : evidenceRunner === "rustc-invariant-matrix"
                                  ? "Invariant matrix evidence"
                                  : evidenceRunner === "rustc-allocator-sanitizer"
                                    ? "Allocator sanitizer evidence"
                                    : evidenceRunner === "rustc-link-resource-matrix"
                                      ? "Link resource-matrix evidence"
                                      : "Compiler evidence";
  const status = publicationStatus(failure);
  const path = `/rust/failures/${failure.slug}`;
  const url = `${siteMetadata.siteUrl}${path}`;
  const casesBySlug = new Map(cases.map((candidate) => [candidate.slug, candidate]));
  const entriesById = new Map<string, (typeof rustFailureAtlasEntries)[number]>(
    rustFailureAtlasEntries.map((entry) => [entry.id, entry])
  );
  const indexEntry = entriesById.get(failure.caseId);
  const canonicalCaseId = canonicalRustFailureCaseId(failure.caseId);
  const canonicalEntry = entriesById.get(canonicalCaseId);
  const canonicalCase = canonicalEntry?.caseSlug
    ? casesBySlug.get(canonicalEntry.caseSlug)
    : undefined;
  const orderedCases = rustFailureAtlasEntries.flatMap((entry) => {
    if (!entry.caseSlug) return [];
    const candidate = casesBySlug.get(entry.caseSlug);
    return candidate ? [candidate] : [];
  });
  const caseIndex = orderedCases.findIndex((candidate) => candidate.slug === failure.slug);
  const previousCase = caseIndex > 0 ? orderedCases[caseIndex - 1] : undefined;
  const nextCase = caseIndex >= 0 ? orderedCases[caseIndex + 1] : undefined;
  const relatedTrails = getRustFailureTrails(failure.caseId);
  const relatedCases = getRelatedRustFailureIds(failure.caseId).flatMap((caseId) => {
    const entry = entriesById.get(caseId);
    if (!entry?.caseSlug) return [];
    const relatedCase = casesBySlug.get(entry.caseSlug);
    return relatedCase ? [relatedCase] : [];
  });
  const areaAtlasPath = `/rust-failure-atlas?area=${encodeURIComponent(failure.area)}#atlas-results`;

  return (
    <SectionContainer>
      <ScrollTopAndComment />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Rust Failure Atlas", url: `${siteMetadata.siteUrl}/rust-failure-atlas` },
          { name: failure.title, url },
        ]}
      />
      <JsonLd
        data={{
          ...failure.structuredData,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          publisher: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          articleSection: area.label,
          abstract: indexEntry
            ? `${failure.symptom} ${indexEntry.likelyCause} First check: ${indexEntry.firstCheck}`
            : failure.summary,
          citation: failure.sources,
          keywords: ["Rust", area.label, "Rust Failure Atlas", ...failure.searchTerms].join(", "),
        }}
      />

      <article>
        <header className="border-b border-gray-200 pt-8 pb-10 md:pt-12 md:pb-12 dark:border-gray-800">
          <Link
            href={areaAtlasPath}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-semibold tracking-[0.16em] uppercase"
            data-umami-event="rust-failure-area-open"
            data-umami-event-case={failure.caseId}
            data-umami-event-area={failure.area}
          >
            Rust Failure Atlas / {area.label}
          </Link>
          <p className="mt-5 text-sm font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
            {failure.caseId} · {executableEvidence ? "Executable case file" : "Reviewed case file"}
            {caseIndex >= 0 ? ` · Case ${caseIndex + 1} of ${orderedCases.length}` : ""}
            {executableEvidence ? ` · ${evidenceLabel}` : ""}
          </p>
          <div className="mt-4 max-w-5xl">
            <PageTitle>{failure.title}</PageTitle>
          </div>
          <p className="mt-6 max-w-4xl text-xl leading-9 text-gray-600 dark:text-gray-300">
            {failure.summary}
          </p>
          <dl className="mt-8 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-semibold text-gray-950 dark:text-gray-100">Reviewed</dt>
              <dd className="mt-1 text-gray-600 dark:text-gray-400">
                <time dateTime={failure.lastmod || failure.date}>
                  {new Date(failure.lastmod || failure.date).toLocaleDateString(
                    siteMetadata.locale,
                    displayDate
                  )}
                </time>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-950 dark:text-gray-100">Rust</dt>
              <dd className="mt-1 text-gray-600 dark:text-gray-400">
                {failure.rustVersions.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-950 dark:text-gray-100">Targets</dt>
              <dd className="mt-1 text-gray-600 dark:text-gray-400">
                {failure.targets.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-950 dark:text-gray-100">Profiles</dt>
              <dd className="mt-1 text-gray-600 dark:text-gray-400">
                {failure.profiles.join(", ")}
              </dd>
            </div>
          </dl>
        </header>

        <div className="grid gap-10 pt-10 pb-12 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-14">
          <div className="min-w-0">
            {status !== "published" && (
              <aside className="mb-8 rounded-md border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <strong className="font-semibold">Local {status} preview.</strong> This case is not
                included in production discovery.
              </aside>
            )}
            {canonicalCase && canonicalCase.caseId !== failure.caseId && (
              <aside className="mb-8 rounded-md border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                <strong className="font-semibold">Consolidated investigation.</strong> This URL is
                preserved, but the stronger reproduction and maintained answer now live in{" "}
                <Link
                  href={`/rust/failures/${canonicalCase.slug}`}
                  className="font-semibold underline"
                >
                  {canonicalCase.title}
                </Link>
                .
              </aside>
            )}
            {indexEntry && (
              <section
                className="mb-10 rounded-lg border border-gray-200 bg-gray-50 p-6 sm:p-7 dark:border-gray-800 dark:bg-gray-900"
                aria-labelledby="quick-diagnosis"
              >
                <p className="text-primary-700 dark:text-primary-400 text-sm font-semibold tracking-[0.14em] uppercase">
                  Direct answer
                </p>
                <h2
                  id="quick-diagnosis"
                  className="mt-3 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
                >
                  What this Rust failure means
                </h2>
                <dl className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-gray-950 dark:text-gray-100">
                      Why it happens
                    </dt>
                    <dd className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                      {indexEntry.likelyCause}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-950 dark:text-gray-100">
                      First discriminating check
                    </dt>
                    <dd className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                      {indexEntry.firstCheck}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <MDXLayoutRenderer
                code={failure.body.code}
                components={components}
                toc={failure.toc}
              />
            </div>
          </div>

          <aside className="space-y-8 xl:order-last" aria-label="Case evidence">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.14em] text-gray-950 uppercase dark:text-gray-100">
                Evidence in this case
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {failure.evidence.map((item) => (
                  <li key={item} className="border-primary-500 border-l-2 pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {executableEvidence && (
              <div>
                <h2 className="text-sm font-semibold tracking-[0.14em] text-gray-950 uppercase dark:text-gray-100">
                  Reproduce it
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {evidenceLabel}. Rechecked {executableEvidence.verifiedAt} with Rust{" "}
                  {executableEvidence.toolchain}, edition {executableEvidence.edition}.
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  <li>
                    <Link
                      href={rustFailureEvidenceUrl(failure.caseId, executableEvidence.failureFile)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      data-umami-event="rust-failure-evidence-download"
                      data-umami-event-case={failure.caseId}
                      data-umami-event-artifact="failing-source"
                      data-umami-event-cohort={growthCohort?.cohort.slug}
                    >
                      Download the failing fixture
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={rustFailureEvidenceUrl(failure.caseId, executableEvidence.repairedFile)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      data-umami-event="rust-failure-evidence-download"
                      data-umami-event-case={failure.caseId}
                      data-umami-event-artifact="repaired-source"
                      data-umami-event-cohort={growthCohort?.cohort.slug}
                    >
                      Download the repaired fixture
                    </Link>
                  </li>
                  {executableEvidence.failureManifest &&
                    executableEvidence.failureManifest !== executableEvidence.failureFile && (
                      <li>
                        <Link
                          href={rustFailureEvidenceUrl(
                            failure.caseId,
                            executableEvidence.failureManifest
                          )}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          data-umami-event="rust-failure-evidence-download"
                          data-umami-event-case={failure.caseId}
                          data-umami-event-artifact="failing-manifest"
                          data-umami-event-cohort={growthCohort?.cohort.slug}
                        >
                          Download the failing Cargo manifest
                        </Link>
                      </li>
                    )}
                  {executableEvidence.repairedManifest &&
                    executableEvidence.repairedManifest !== executableEvidence.repairedFile && (
                      <li>
                        <Link
                          href={rustFailureEvidenceUrl(
                            failure.caseId,
                            executableEvidence.repairedManifest
                          )}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          data-umami-event="rust-failure-evidence-download"
                          data-umami-event-case={failure.caseId}
                          data-umami-event-artifact="repaired-manifest"
                          data-umami-event-cohort={growthCohort?.cohort.slug}
                        >
                          Download the repaired Cargo manifest
                        </Link>
                      </li>
                    )}
                  {executableEvidence.failureCargoConfig && (
                    <li>
                      <Link
                        href={rustFailureEvidenceUrl(
                          failure.caseId,
                          executableEvidence.failureCargoConfig
                        )}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        data-umami-event="rust-failure-evidence-download"
                        data-umami-event-case={failure.caseId}
                        data-umami-event-artifact="failing-cargo-config"
                        data-umami-event-cohort={growthCohort?.cohort.slug}
                      >
                        Download the failing Cargo configuration
                      </Link>
                    </li>
                  )}
                  {executableEvidence.repairedCargoConfig && (
                    <li>
                      <Link
                        href={rustFailureEvidenceUrl(
                          failure.caseId,
                          executableEvidence.repairedCargoConfig
                        )}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        data-umami-event="rust-failure-evidence-download"
                        data-umami-event-case={failure.caseId}
                        data-umami-event-artifact="repaired-cargo-config"
                        data-umami-event-cohort={growthCohort?.cohort.slug}
                      >
                        Download the repaired Cargo configuration
                      </Link>
                    </li>
                  )}
                  {executableEvidence.hostFile && (
                    <li>
                      <Link
                        href={rustFailureEvidenceUrl(failure.caseId, executableEvidence.hostFile)}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        data-umami-event="rust-failure-evidence-download"
                        data-umami-event-case={failure.caseId}
                        data-umami-event-artifact="foreign-host"
                        data-umami-event-cohort={growthCohort?.cohort.slug}
                      >
                        Download the foreign host fixture
                      </Link>
                    </li>
                  )}
                  {executableEvidence.allocatorFile && (
                    <li>
                      <Link
                        href={rustFailureEvidenceUrl(
                          failure.caseId,
                          executableEvidence.allocatorFile
                        )}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        data-umami-event="rust-failure-evidence-download"
                        data-umami-event-case={failure.caseId}
                        data-umami-event-artifact="allocator-owner"
                        data-umami-event-cohort={growthCohort?.cohort.slug}
                      >
                        Download the allocator-owner fixture
                      </Link>
                    </li>
                  )}
                  {executableEvidence.resourceRunnerFile && (
                    <li>
                      <Link
                        href={rustFailureEvidenceUrl(
                          failure.caseId,
                          executableEvidence.resourceRunnerFile
                        )}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        data-umami-event="rust-failure-evidence-download"
                        data-umami-event-case={failure.caseId}
                        data-umami-event-artifact="resource-runner"
                        data-umami-event-cohort={growthCohort?.cohort.slug}
                      >
                        Download the resource-limit runner
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold tracking-[0.14em] text-gray-950 uppercase dark:text-gray-100">
                Primary sources
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-6">
                {failure.sources.map((source) => (
                  <li key={source}>
                    <Link
                      href={source}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 break-words"
                      data-umami-event="rust-failure-source-open"
                      data-umami-event-case={failure.caseId}
                      data-umami-event-host={new URL(source).hostname}
                    >
                      {primarySourceLabel(source)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <footer className="border-t border-gray-200 py-10 dark:border-gray-800">
          <nav aria-label="Failure case navigation">
            <Link
              href={areaAtlasPath}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
              data-umami-event="rust-failure-area-open"
              data-umami-event-case={failure.caseId}
              data-umami-event-area={failure.area}
            >
              &larr; Browse all {area.label.toLocaleLowerCase("en")} cases
            </Link>

            {relatedCases.length > 0 && (
              <section className="mt-8" aria-labelledby="related-failure-cases">
                <p
                  id="related-failure-cases"
                  className="text-sm font-semibold tracking-[0.14em] text-gray-950 uppercase dark:text-gray-100"
                >
                  Continue by mechanism
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {relatedTrails.map((trail) => trail.label).join(" · ")}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {relatedCases.map((relatedCase) => (
                    <Link
                      key={relatedCase.caseId}
                      href={`/rust/failures/${relatedCase.slug}`}
                      className="hover:border-primary-500 dark:hover:border-primary-500 rounded-lg border border-gray-200 p-5 dark:border-gray-800"
                      data-umami-event="rust-failure-related-open"
                      data-umami-event-source={failure.caseId}
                      data-umami-event-destination={relatedCase.caseId}
                    >
                      <span className="text-xs font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
                        {relatedCase.caseId}
                      </span>
                      <span className="mt-2 block leading-6 font-semibold text-gray-950 dark:text-gray-100">
                        {relatedCase.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {previousCase ? (
                <Link
                  href={`/rust/failures/${previousCase.slug}`}
                  rel="prev"
                  className="hover:border-primary-500 dark:hover:border-primary-500 rounded-lg border border-gray-200 p-5 dark:border-gray-800"
                  data-umami-event="rust-failure-sequence-open"
                  data-umami-event-source={failure.caseId}
                  data-umami-event-direction="previous"
                  data-umami-event-destination={previousCase.caseId}
                >
                  <span className="text-xs font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
                    Previous case
                  </span>
                  <span className="mt-2 block leading-6 font-semibold text-gray-950 dark:text-gray-100">
                    {previousCase.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {nextCase && (
                <Link
                  href={`/rust/failures/${nextCase.slug}`}
                  rel="next"
                  className="hover:border-primary-500 dark:hover:border-primary-500 rounded-lg border border-gray-200 p-5 text-right dark:border-gray-800"
                  data-umami-event="rust-failure-sequence-open"
                  data-umami-event-source={failure.caseId}
                  data-umami-event-direction="next"
                  data-umami-event-destination={nextCase.caseId}
                >
                  <span className="text-xs font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
                    Next case
                  </span>
                  <span className="mt-2 block leading-6 font-semibold text-gray-950 dark:text-gray-100">
                    {nextCase.title}
                  </span>
                </Link>
              )}
            </div>
          </nav>

          <div className="mt-10 rounded-lg bg-gray-50 p-6 md:flex md:items-center md:justify-between md:gap-8 dark:bg-gray-900">
            <div className="max-w-2xl">
              <p className="font-semibold text-gray-950 dark:text-gray-100">
                Working through a Rust failure that does not fit the obvious answer?
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                I help teams reduce difficult compiler, runtime, integration, and performance
                problems into evidence they can reproduce and maintain.
              </p>
            </div>
            <Link
              href="/work"
              className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mt-5 inline-block shrink-0 font-semibold md:mt-0"
              data-umami-event="rust-failure-professional-cta"
              data-umami-event-case={failure.caseId}
              data-umami-event-cohort={growthCohort?.cohort.slug}
              data-umami-event-destination="work"
            >
              See how I work &rarr;
            </Link>
          </div>
        </footer>
      </article>
    </SectionContainer>
  );
}
