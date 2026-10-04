import { allBlogs, type Blog } from "contentlayer/generated";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { formatDate } from "pliny/utils/formatDate";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import Link from "@/components/Link";
import { contentClusters, getContentCluster } from "@/data/content-clusters.mjs";
import siteMetadata from "@/data/siteMetadata";
import { filterVisiblePosts } from "lib/publication.mjs";

type PageProps = { params: Promise<{ cluster: string }> };

export function generateStaticParams() {
  return contentClusters.map((cluster) => ({ cluster: cluster.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata | undefined> {
  const { cluster: clusterSlug } = await params;
  const cluster = getContentCluster(clusterSlug);
  if (!cluster) return;

  return {
    title: cluster.title,
    description: cluster.description,
    alternates: { canonical: `/blog/topics/${cluster.slug}` },
    openGraph: {
      title: cluster.title,
      description: cluster.description,
      type: "website",
      url: `/blog/topics/${cluster.slug}`,
    },
  };
}

export default async function ContentClusterPage({ params }: PageProps) {
  const { cluster: clusterSlug } = await params;
  const cluster = getContentCluster(clusterSlug);
  if (!cluster) return notFound();

  const posts = allCoreContent(
    sortPosts(filterVisiblePosts<Blog>(allBlogs).filter((post) => post.cluster === cluster.slug))
  );
  const featuredPosts = cluster.featuredSlugs
    .map((featuredSlug) => posts.find((post) => post.slug === featuredSlug))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
  const remainingPosts = posts.filter((post) => !cluster.featuredSlugs.includes(post.slug));
  const pageUrl = `${siteMetadata.siteUrl}/blog/topics/${cluster.slug}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Writing", url: `${siteMetadata.siteUrl}/blog` },
          { name: cluster.title, url: pageUrl },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cluster.title,
          description: cluster.description,
          url: pageUrl,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          hasPart: posts.map((post) => ({
            "@type": "Article",
            name: post.title,
            url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
          })),
        }}
      />

      <header className="max-w-4xl pt-8 pb-14 md:pt-12 md:pb-20">
        <Link
          href="/blog"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-semibold tracking-[0.16em] uppercase"
          data-umami-event="cluster-navigation"
          data-umami-event-destination="writing-index"
          data-umami-event-cluster={cluster.slug}
        >
          Writing / Technical series
        </Link>
        <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          {cluster.title}
        </h1>
        <p className="mt-3 text-lg font-medium text-gray-500 dark:text-gray-400">
          {cluster.subtitle}
        </p>
        <p className="mt-7 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          {cluster.description}
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          This series is part of the{" "}
          <Link
            href="/blog/roadmap"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            technical writing roadmap through December
          </Link>
          .
        </p>
        {cluster.slug === "rust-under-the-hood" && (
          <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
            The compiler, Cargo, async, memory, target, release, and failure investigations are also
            connected through the{" "}
            <Link
              href="/rust"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            >
              Rust Systems Atlas
            </Link>
            .
          </p>
        )}
      </header>

      <section
        className="grid gap-8 border-y border-gray-200 py-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] dark:border-gray-800"
        aria-labelledby="series-model"
      >
        <div className="max-w-3xl space-y-5 text-lg leading-8 text-gray-700 dark:text-gray-300">
          <h2
            id="series-model"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            The model behind the series
          </h2>
          {cluster.introduction.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <aside className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-950 dark:text-gray-100">Questions covered</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {cluster.questions.map((question) => (
              <li key={question} className="border-primary-500 border-l-2 pl-3">
                {question}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="series-principles">
        <h2
          id="series-principles"
          className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
        >
          Core principles
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {cluster.principles.map((principle, index) => (
            <div
              key={principle.title}
              className="rounded-lg border border-gray-200 p-6 dark:border-gray-800"
            >
              <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                0{index + 1}
              </p>
              <h3 className="mt-3 text-xl font-bold text-gray-950 dark:text-gray-100">
                {principle.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {featuredPosts.length > 0 && (
        <section aria-labelledby="series-start-here">
          <div className="max-w-3xl">
            <h2
              id="series-start-here"
              className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              Start here
            </h2>
            <p className="mt-3 text-lg leading-8 text-gray-600 dark:text-gray-400">
              The strongest entry points into this subject, ordered as a useful reading path.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {featuredPosts.map((post, index) => (
              <article
                key={post.slug}
                className="rounded-lg border border-gray-200 p-6 dark:border-gray-800"
              >
                <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                  {String(index + 1).padStart(2, "0")}
                </p>
                {post.draft && (
                  <p className="mt-2 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                    Local draft preview
                  </p>
                )}
                <h3 className="mt-3 text-xl leading-8 font-bold tracking-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                    data-umami-event="cluster-article-click"
                    data-umami-event-cluster={cluster.slug}
                    data-umami-event-position="featured"
                    data-umami-event-article={post.slug}
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{post.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {remainingPosts.length > 0 && (
        <section className="py-16 md:py-20" aria-labelledby="series-all-articles">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2
                id="series-all-articles"
                className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
              >
                All articles in this series
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                {posts.length} focused {posts.length === 1 ? "article" : "articles"}, organized
                around one engineering problem at a time.
              </p>
            </div>
          </div>
          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {remainingPosts.map((post) => (
              <article
                key={post.slug}
                className="grid gap-3 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-8"
              >
                <div>
                  {post.draft && (
                    <p className="mb-2 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                      Local draft preview
                    </p>
                  )}
                  <h3 className="text-lg font-bold">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                      data-umami-event="cluster-article-click"
                      data-umami-event-cluster={cluster.slug}
                      data-umami-event-position="archive"
                      data-umami-event-article={post.slug}
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">{post.summary}</p>
                </div>
                <time
                  dateTime={post.date}
                  className="text-sm text-gray-500 tabular-nums dark:text-gray-400"
                >
                  {formatDate(post.date, siteMetadata.locale)}
                </time>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-gray-200 py-16 dark:border-gray-800">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Engineering context
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
          {cluster.cta.title}
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
          {cluster.cta.description}
        </p>
        <div className="mt-7 flex flex-wrap gap-4">
          <Link
            href={cluster.cta.primary.href}
            className="bg-primary-700 hover:bg-primary-800 rounded-md px-5 py-3 font-semibold text-white"
            data-umami-event="cluster-professional-cta"
            data-umami-event-cluster={cluster.slug}
            data-umami-event-destination={cluster.cta.primary.href}
          >
            {cluster.cta.primary.label}
          </Link>
          <Link
            href={cluster.cta.secondary.href}
            className="hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 rounded-md border border-gray-300 px-5 py-3 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100"
            data-umami-event="cluster-professional-cta"
            data-umami-event-cluster={cluster.slug}
            data-umami-event-destination={cluster.cta.secondary.href}
          >
            {cluster.cta.secondary.label}
          </Link>
        </div>
      </section>
    </>
  );
}

export const dynamicParams = false;
