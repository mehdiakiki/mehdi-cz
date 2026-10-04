import { allBlogs, allRustFailures, type Blog, type RustFailure } from "contentlayer/generated";
import type { Metadata } from "next";

import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import Link from "@/components/Link";
import { authorityOpportunities } from "@/data/authority-opportunities.mjs";
import {
  getRustAtlasClaim,
  rustAtlasClaims,
  rustAtlasClaimStatuses,
} from "@/data/rust-atlas-claims.mjs";
import { getRustFailureEvidence } from "@/data/rust-failure-evidence.mjs";
import { isRustFailureAtlasLaunched } from "@/data/rust-failure-atlas.mjs";
import {
  rustAtlasSectionForEditorialArticle,
  rustAtlasSectionForOpportunity,
  rustSystemsAtlasAxes,
  rustSystemsAtlasGoal,
  rustSystemsAtlasSections,
} from "@/data/rust-systems-atlas.mjs";
import siteMetadata from "@/data/siteMetadata";
import { filterVisiblePosts, publicationStatus } from "lib/publication.mjs";

const pagePath = "/rust";
const pageUrl = `${siteMetadata.siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "Rust Systems Atlas: Compiler, Runtime, Cargo, Memory, and Failures",
  description:
    "An evidence-backed map of Rust compiler internals, Cargo and linking, async runtimes, memory and unsafe code, targets, releases, and difficult failures.",
  alternates: { canonical: pagePath },
  openGraph: {
    title: "Rust Systems Atlas",
    description:
      "Follow Rust behavior from an observed failure through the compiler, runtime, build graph, target, and evidence that explains it.",
    type: "website",
    url: pagePath,
  },
};

function visibleRustMaterial() {
  const visiblePosts = filterVisiblePosts<Blog>(allBlogs);
  const visibleFailures = filterVisiblePosts<RustFailure>(allRustFailures);
  const opportunitiesBySlug = new Map(
    authorityOpportunities
      .filter((opportunity) => opportunity.cluster === "rust-under-the-hood")
      .map((opportunity) => [opportunity.slug, opportunity])
  );

  const articles = visiblePosts
    .filter((post) => post.cluster === "rust-under-the-hood")
    .flatMap((post) => {
      const opportunity = opportunitiesBySlug.get(post.slug);
      const section = opportunity
        ? rustAtlasSectionForOpportunity(opportunity)
        : rustAtlasSectionForEditorialArticle(post.slug);
      if (!section) return [];

      const claim = getRustAtlasClaim(post.slug);
      return [
        {
          id: opportunity?.id || `ARTICLE-${post.slug}`,
          section,
          path: `/blog/${post.slug}`,
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          date: post.date,
          kind: "Article",
          evidenceStatus: claim?.status,
          isPreview: publicationStatus(post) !== "published",
        },
      ];
    });

  const failures = visibleFailures.map((failure) => ({
    id: failure.caseId,
    section: "diagnostic-failures",
    path: `/rust/failures/${failure.slug}`,
    slug: failure.slug,
    title: failure.title,
    summary: failure.summary,
    date: failure.date,
    kind: "Failure case",
    evidenceStatus: getRustFailureEvidence(failure.caseId) ? "verified" : undefined,
    isPreview: publicationStatus(failure) !== "published",
  }));

  return [...articles, ...failures].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
}

export default function RustSystemsAtlasPage() {
  const material = visibleRustMaterial();
  const failureAtlasLaunched = isRustFailureAtlasLaunched();
  const availableArticleSlugs = new Set(
    material.filter((item) => item.kind === "Article").map((item) => item.slug)
  );
  const visibleClaims = rustAtlasClaims.filter((claim) =>
    availableArticleSlugs.has(claim.articleSlug)
  );
  const articleMaterial = material.filter((item) => item.kind === "Article");
  const executableMaterial = material.filter((item) => item.evidenceStatus === "verified").length;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Rust Systems Atlas", url: pageUrl },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Rust Systems Atlas",
          description:
            "An evidence-backed map of Rust compiler, runtime, build, memory, target, release, and failure investigations.",
          url: pageUrl,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: material.length,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
          },
        }}
      />

      <header className="max-w-5xl pt-8 pb-14 md:pt-12 md:pb-20">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Rust, from symptom to implementation
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Rust Systems Atlas
        </h1>
        <p className="mt-7 max-w-4xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          I am building one connected map of Rust: the compiler representations, Cargo decisions,
          runtime behavior, memory rules, target boundaries, release changes, and failures that make
          these details matter in real code.
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          This is not another language introduction and it is not a copy of the standard library
          documentation. Each page should answer one difficult question with a source trail, a
          runnable experiment, or another piece of evidence that a reader can challenge.
        </p>
      </header>

      <section
        className="grid gap-5 border-y border-gray-200 py-10 md:grid-cols-3 dark:border-gray-800"
        aria-label="Atlas state"
      >
        <div>
          <p className="text-3xl font-bold text-gray-950 tabular-nums dark:text-gray-100">
            {material.length} / {rustSystemsAtlasGoal.canonicalPages}
          </p>
          <p className="mt-2 font-semibold text-gray-950 dark:text-gray-100">
            {material.some((item) => item.isPreview)
              ? "canonical pages in local preview"
              : "published canonical pages"}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Articles and dedicated failure pages count once, even when several maps link to them.
          </p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-950 tabular-nums dark:text-gray-100">
            {rustSystemsAtlasSections.length}
          </p>
          <p className="mt-2 font-semibold text-gray-950 dark:text-gray-100">permanent maps</p>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Failures, compiler, builds, async, memory, targets, and releases stay connected.
          </p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-950 tabular-nums dark:text-gray-100">
            {executableMaterial}
          </p>
          <p className="mt-2 font-semibold text-gray-950 dark:text-gray-100">
            executable evidence links
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            A passing fixture proves a bounded claim; performance claims stay conditional.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="atlas-maps">
        <div className="max-w-4xl">
          <h2
            id="atlas-maps"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Seven maps, one system
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            A failure rarely respects one documentation category. An async Send error can begin in a
            type, become stored future state, meet a runtime requirement, and surface as a trait
            diagnostic. The atlas keeps these paths visible.
          </p>
        </div>

        <div className="mt-9 space-y-8">
          {rustSystemsAtlasSections.map((section) => {
            const entries = material.filter((item) => item.section === section.slug);
            const sectionLinkAvailable =
              section.slug !== "diagnostic-failures" || failureAtlasLaunched;

            return (
              <article
                key={section.slug}
                id={section.slug}
                className="scroll-mt-24 rounded-lg border border-gray-200 p-6 md:p-8 dark:border-gray-800"
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div>
                    <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.14em] uppercase">
                      {section.shortTitle}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
                      {section.title}
                    </h3>
                    <p className="mt-4 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
                      {section.description}
                    </p>
                    {sectionLinkAvailable && (
                      <Link
                        href={section.href}
                        prefetch={false}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-5 inline-block font-semibold"
                        data-umami-event="rust-atlas-section-open"
                        data-umami-event-section={section.slug}
                      >
                        Open this map &rarr;
                      </Link>
                    )}
                  </div>
                  <aside>
                    <p className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                      Questions this map must answer
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                      {section.questions.map((question) => (
                        <li key={question} className="border-primary-500 border-l-2 pl-3">
                          {question}
                        </li>
                      ))}
                    </ul>
                  </aside>
                </div>

                {entries.length > 0 && (
                  <div className="mt-7 border-t border-gray-200 pt-6 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                      {entries.length} {entries.length === 1 ? "entry" : "entries"} available in
                      this map
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {entries.slice(0, 4).map((entry) => (
                        <Link
                          key={entry.id}
                          href={entry.path}
                          prefetch={false}
                          className="hover:text-primary-600 dark:hover:text-primary-400 rounded-md bg-gray-50 p-4 text-sm leading-6 font-semibold text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          data-umami-event="rust-atlas-entry-open"
                          data-umami-event-entry={entry.id}
                          data-umami-event-section={entry.section}
                          data-umami-event-kind={entry.kind}
                        >
                          <span className="block text-xs tracking-[0.12em] text-gray-500 uppercase dark:text-gray-400">
                            {entry.kind}
                          </span>
                          <span className="mt-1 block">{entry.title}</span>
                        </Link>
                      ))}
                    </div>
                    {entries.length > 4 && (
                      <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        {section.slug === "diagnostic-failures" ? (
                          <>
                            The full canonical failure collection is available in the symptom
                            directory linked above; related investigations also appear in the
                            article directory below.
                          </>
                        ) : (
                          <>
                            {entries.length - 4} more{" "}
                            {entries.length - 4 === 1 ? "entry is" : "entries are"} available in the
                            complete article directory below.
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="border-y border-gray-200 py-16 dark:border-gray-800"
        aria-labelledby="rust-article-directory"
      >
        <div className="max-w-4xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            Complete article directory
          </p>
          <h2
            id="rust-article-directory"
            className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Every published Rust investigation
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">
            These article links stay in the server-rendered document. The much larger symptom-first
            failure collection has its own complete server directory in the Rust Failure Atlas.
          </p>
        </div>

        <div className="mt-9 grid gap-8 lg:grid-cols-2">
          {rustSystemsAtlasSections.flatMap((section) => {
            const entries = articleMaterial.filter((item) => item.section === section.slug);
            if (entries.length === 0) return [];

            return [
              <section key={section.slug} aria-labelledby={`rust-articles-${section.slug}`}>
                <h3
                  id={`rust-articles-${section.slug}`}
                  className="font-bold text-gray-950 dark:text-gray-100"
                >
                  {section.shortTitle} ({entries.length})
                </h3>
                <ul className="mt-3 space-y-2 border-t border-gray-200 pt-4 text-sm leading-6 dark:border-gray-800">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={entry.path}
                        className="hover:text-primary-600 dark:hover:text-primary-400 font-semibold text-gray-700 dark:text-gray-300"
                        data-umami-event="rust-atlas-entry-open"
                        data-umami-event-entry={entry.id}
                        data-umami-event-section={entry.section}
                        data-umami-event-kind={entry.kind}
                      >
                        {entry.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>,
            ];
          })}
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="claim-ledger">
        <div className="max-w-4xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            Claim ledger
          </p>
          <h2
            id="claim-ledger"
            className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Every strong statement needs a way to lose
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">
            I separate deterministic claims from source-level constraints and machine-dependent
            performance hypotheses. Each record names the observation that would prove my
            explanation incomplete. This prevents an attractive benchmark number from becoming a
            universal Rust rule.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
            {Object.entries(rustAtlasClaimStatuses).map(([status, details]) => (
              <span
                key={status}
                className="rounded-full bg-gray-100 px-3 py-2 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {details.label}: {visibleClaims.filter((claim) => claim.status === status).length}
              </span>
            ))}
          </div>
        </div>

        {visibleClaims.length > 0 && (
          <ol className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {visibleClaims.map((claim) => {
              const details = rustAtlasClaimStatuses[claim.status];
              const article = material.find((item) => item.slug === claim.articleSlug);
              if (!article) return null;

              return (
                <li
                  key={claim.id}
                  className="min-w-0 rounded-lg border border-gray-200 p-6 dark:border-gray-800"
                >
                  <p className="text-primary-600 dark:text-primary-400 text-xs font-semibold tracking-[0.14em] uppercase">
                    {claim.id} · {details.label}
                  </p>
                  <p className="mt-3 leading-7 font-semibold text-gray-950 dark:text-gray-100">
                    {claim.claim}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    <strong className="font-semibold text-gray-800 dark:text-gray-200">
                      Falsifier:
                    </strong>{" "}
                    {claim.falsifier}
                  </p>
                  <p
                    className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    <strong className="font-semibold text-gray-800 dark:text-gray-200">
                      Evidence:
                    </strong>{" "}
                    {claim.evidence}
                  </p>
                  <Link
                    href={article.path}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-5 inline-block font-semibold"
                    data-umami-event="rust-atlas-claim-open"
                    data-umami-event-claim={claim.id}
                  >
                    Read the tested explanation &rarr;
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-900">
          <p className="font-semibold text-gray-950 dark:text-gray-100">
            Run the current deterministic claim lab
          </p>
          <code className="mt-3 block overflow-x-auto text-sm text-gray-700 dark:text-gray-300">
            npm run content:verify-rust-claims
          </code>
          <Link
            href={`${siteMetadata.siteRepo}/tree/main/experiments/rust-atlas/aho-corasick-claims`}
            className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mt-4 inline-block font-semibold"
          >
            Inspect the pinned fixtures &rarr;
          </Link>
        </div>
      </section>

      <section
        className="border-y border-gray-200 py-16 dark:border-gray-800"
        aria-labelledby="evidence-layer"
      >
        <div className="max-w-4xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            The difficult-to-copy layer
          </p>
          <h2
            id="evidence-layer"
            className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Explanations are connected to evidence
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">
            The long-term advantage is not article volume. It is a versioned evidence layer:
            compile-fail fixtures, Miri and concurrency cases, target builds, compiler output,
            source locations, traces, layouts, IR, assembly, and regressions that can be rerun.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {["Observe", "Separate", "Reproduce", "Prevent"].map((step, index) => (
            <li key={step} className="rounded-lg border border-gray-200 p-5 dark:border-gray-800">
              <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                0{index + 1}
              </p>
              <p className="mt-3 text-lg font-bold text-gray-950 dark:text-gray-100">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="atlas-indexing">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="max-w-3xl">
            <h2
              id="atlas-indexing"
              className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              More than a folder of articles
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Each canonical page is indexed across the dimensions engineers actually use while
              debugging. This makes the same investigation reachable from an error fragment, a
              compiler phase, a target, a release, or the kind of evidence available.
            </p>
          </div>
          <ul className="space-y-2 rounded-lg bg-gray-50 p-6 text-sm leading-6 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            {rustSystemsAtlasAxes.map((axis) => (
              <li key={axis} className="border-primary-500 border-l-2 pl-3">
                {axis}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-gray-200 py-16 dark:border-gray-800">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Source-level experience
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
          The atlas grows from work, experiments, and upstream reading
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
          I still write and review code directly, including my Rust, Deno, and rust-analyzer open
          source contributions. The purpose of this atlas is to turn that practice into explanations
          another engineer can inspect and use.
        </p>
        <div className="mt-7 flex flex-wrap gap-4">
          <Link
            href="/open-source"
            className="bg-primary-700 hover:bg-primary-800 rounded-md px-5 py-3 font-semibold text-white"
          >
            Review open-source work
          </Link>
          <Link
            href="/blog/topics/rust-under-the-hood"
            className="hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 rounded-md border border-gray-300 px-5 py-3 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            Read Rust investigations
          </Link>
        </div>
      </section>
    </>
  );
}
