import { allBlogs, type Blog } from "contentlayer/generated";
import type { Metadata } from "next";

import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import Link from "@/components/Link";
import { contentClusters, getContentCluster } from "@/data/content-clusters.mjs";
import siteMetadata from "@/data/siteMetadata";
import { authorityCalendar } from "lib/authority-schedule.mjs";
import { filterPublishedPosts } from "lib/publication.mjs";

const pagePath = "/blog/roadmap";
const pageUrl = `${siteMetadata.siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "Technical Writing Roadmap Through December 2026",
  description:
    "The publication roadmap for 200 focused articles and substantial revisions on Rust internals, reliable data systems, and production AI engineering.",
  alternates: { canonical: pagePath },
  openGraph: {
    title: "Technical Writing Roadmap Through December 2026",
    description:
      "A dated roadmap for deep technical writing on Rust, distributed data systems, and reliable AI products.",
    type: "website",
    url: pagePath,
  },
};

const publishedSlugs = new Set(filterPublishedPosts<Blog>(allBlogs).map((post) => post.slug));

const monthlyRoadmap = [
  ...new Set(authorityCalendar.map((entry) => entry.scheduledFor.slice(0, 7))),
]
  .map((month) => ({
    month,
    entries: authorityCalendar.filter((entry) => entry.scheduledFor.startsWith(month)),
  }))
  .map(({ month, entries }) => ({
    month,
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${month}-01T12:00:00Z`)),
    entries,
  }));

function dayLabel(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${timestamp.slice(0, 10)}T12:00:00Z`));
}

export default function WritingRoadmap() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Writing", url: `${siteMetadata.siteUrl}/blog` },
          { name: "Roadmap", url: pageUrl },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Technical Writing Roadmap Through December 2026",
          description:
            "A dated editorial roadmap for Rust internals, reliable data systems, and production AI engineering.",
          url: pageUrl,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: authorityCalendar.length,
            itemListElement: authorityCalendar.map((entry, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: entry.workingTitle,
              url: publishedSlugs.has(entry.slug)
                ? `${siteMetadata.siteUrl}/blog/${entry.slug}`
                : `${pageUrl}#${entry.id.toLowerCase()}`,
            })),
          },
        }}
      />

      <header className="max-w-4xl pt-8 pb-14 md:pt-12 md:pb-20">
        <Link
          href="/blog"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-semibold tracking-[0.16em] uppercase"
        >
          Writing / Roadmap
        </Link>
        <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Technical writing through December
        </h1>
        <p className="mt-7 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          Two hundred focused pieces of work across Rust internals, reliable data systems, and
          production AI engineering. This page makes the editorial direction public without
          pretending that an unfinished article already exists.
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          Dates are targets in the review calendar. A new article receives its own public URL only
          after its examples, sources, search intent, technical claims, and NDA safety have been
          reviewed. Existing articles remain available while their substantial revisions are
          prepared.
        </p>
      </header>

      <section
        className="grid gap-5 border-y border-gray-200 py-10 md:grid-cols-3 dark:border-gray-800"
        aria-label="Roadmap totals"
      >
        {contentClusters.map((cluster) => {
          const count = authorityCalendar.filter((entry) => entry.cluster === cluster.slug).length;
          return (
            <div key={cluster.slug}>
              <p className="text-3xl font-bold text-gray-950 tabular-nums dark:text-gray-100">
                {count}
              </p>
              <p className="mt-1 font-semibold text-gray-950 dark:text-gray-100">
                {cluster.shortTitle}
              </p>
              <Link
                href={`/blog/topics/${cluster.slug}`}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-3 inline-block text-sm font-semibold"
              >
                Read the live series &rarr;
              </Link>
            </div>
          );
        })}
      </section>

      <nav className="py-10" aria-label="Roadmap months">
        <p className="text-sm font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
          Jump to month
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {monthlyRoadmap.map(({ month, label }) => (
            <Link
              key={month}
              href={`#${month}`}
              className="hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="space-y-16 pb-20">
        {monthlyRoadmap.map(({ month, label, entries }) => (
          <section
            key={month}
            id={month}
            className="scroll-mt-24"
            aria-labelledby={`${month}-title`}
          >
            <div className="flex items-end justify-between gap-4">
              <h2
                id={`${month}-title`}
                className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
              >
                {label}
              </h2>
              <p className="text-sm text-gray-500 tabular-nums dark:text-gray-400">
                {entries.length} {entries.length === 1 ? "item" : "items"}
              </p>
            </div>

            <ol className="mt-7 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {entries.map((entry) => {
                const cluster = getContentCluster(entry.cluster);
                const isPublished = publishedSlugs.has(entry.slug);
                const status = isPublished
                  ? entry.action === "upgrade"
                    ? "Existing article · revision planned"
                    : "Published article"
                  : entry.action === "upgrade"
                    ? "Existing article · revision planned"
                    : "Planned article";

                return (
                  <li
                    key={entry.id}
                    id={entry.id.toLowerCase()}
                    className="grid scroll-mt-24 gap-3 py-5 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-7"
                  >
                    <div>
                      <time
                        dateTime={entry.scheduledFor}
                        className="font-semibold text-gray-900 tabular-nums dark:text-gray-100"
                      >
                        {dayLabel(entry.scheduledFor)}
                      </time>
                      <p className="mt-1 text-xs tracking-[0.1em] text-gray-500 uppercase dark:text-gray-400">
                        {entry.scheduledFor.slice(11, 16)} UTC+1
                      </p>
                    </div>
                    <div>
                      <p className="text-primary-600 dark:text-primary-400 text-xs font-semibold tracking-[0.12em] uppercase">
                        {cluster?.shortTitle} · {status}
                      </p>
                      <h3 className="mt-2 text-lg leading-7 font-bold text-gray-950 dark:text-gray-100">
                        {isPublished ? (
                          <Link
                            href={`/blog/${entry.slug}`}
                            className="hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            {entry.workingTitle}
                          </Link>
                        ) : (
                          entry.workingTitle
                        )}
                      </h3>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
