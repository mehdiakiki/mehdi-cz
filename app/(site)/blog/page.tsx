import { allBlogs, type Blog } from "contentlayer/generated";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { formatDate } from "pliny/utils/formatDate";
import Link from "@/components/WritingIndexIntentLink";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { contentClusters } from "@/data/content-clusters.mjs";
import { featuredWritingSlugs, selectedWritingSlugs } from "@/data/featuredWriting";
import siteMetadata from "@/data/siteMetadata";
import { genPageMetadata } from "app/seo";
import { filterVisiblePosts } from "lib/publication.mjs";
import { filterNotePosts, filterWritingPosts } from "lib/content-format.mjs";
import { slug } from "github-slugger";

export const metadata = genPageMetadata({
  title: "Writing",
  description:
    "Selected engineering writing by Mehdi Akiki on distributed systems, Rust, reliability, performance, data, and software architecture.",
});

export default function Writing() {
  const visiblePosts = filterVisiblePosts<Blog>(allBlogs);
  const posts = allCoreContent(sortPosts(filterWritingPosts(visiblePosts)));
  const noteCount = filterNotePosts(visiblePosts).length;
  const latestPosts = posts.slice(0, 5);
  const selectedPosts = selectedWritingSlugs
    .map((postSlug) => posts.find((post) => post.slug === postSlug))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
  const featuredPosts = selectedPosts.filter((post) => featuredWritingSlugs.includes(post.slug));
  const moreSelectedPosts = selectedPosts.filter(
    (post) => !featuredWritingSlugs.includes(post.slug)
  );

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Writing", url: `${siteMetadata.siteUrl}/blog` },
        ]}
      />

      <header className="max-w-4xl pt-8 pb-14 md:pt-12 md:pb-20">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Long-form engineering
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Writing
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          Detailed explanations of the models beneath distributed systems, networking, data,
          performance, and software architecture.
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          Looking for compact commands and observations? The {noteCount} shorter entries now live in
          a separate{" "}
          <Link
            href="/notes"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            engineering notes archive
          </Link>
          .
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          The next body of work is already mapped across three connected series. See the{" "}
          <Link
            href="/blog/roadmap"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            technical writing roadmap through December
          </Link>
          .
        </p>
      </header>

      <section
        className="border-primary-200 bg-primary-50 dark:border-primary-900 dark:bg-primary-950/40 mb-16 grid gap-7 rounded-lg border p-7 md:mb-20 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-9"
        aria-labelledby="rust-systems-atlas"
      >
        <div className="max-w-3xl">
          <p className="text-primary-700 dark:text-primary-300 text-sm font-semibold tracking-[0.16em] uppercase">
            Connected reference
          </p>
          <h2
            id="rust-systems-atlas"
            className="mt-3 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Rust Systems Atlas
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-700 dark:text-gray-300">
            One map connecting Rust failures, compiler internals, Cargo and linking, async runtimes,
            memory and unsafe code, targets, and release compatibility. Each explanation leads back
            to evidence a reader can inspect.
          </p>
        </div>
        <Link
          href="/rust"
          className="text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200 font-semibold"
          data-umami-event="writing-rust-systems-atlas"
        >
          Explore the Rust atlas &rarr;
        </Link>
      </section>

      <section className="pb-16 md:pb-20" aria-labelledby="technical-series">
        <div className="max-w-3xl">
          <h2
            id="technical-series"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Technical series
          </h2>
          <p className="mt-3 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Three connected bodies of work: language internals, reliable data systems, and
            production AI engineering.
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {contentClusters.map((cluster) => (
            <article
              key={cluster.slug}
              className="flex flex-col rounded-lg border border-gray-200 p-6 dark:border-gray-800"
            >
              <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.12em] uppercase">
                {cluster.subtitle}
              </p>
              <h3 className="mt-4 text-2xl leading-8 font-bold tracking-tight text-gray-950 dark:text-gray-100">
                {cluster.title}
              </h3>
              <p className="mt-4 flex-1 leading-7 text-gray-600 dark:text-gray-400">
                {cluster.description}
              </p>
              <Link
                href={`/blog/topics/${cluster.slug}`}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-6 font-semibold"
                data-umami-event="writing-cluster-click"
                data-umami-event-cluster={cluster.slug}
              >
                Explore the series &rarr;
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="latest-writing">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2
              id="latest-writing"
              className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              Latest writing
            </h2>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
              Newly published articles, ordered by release date.
            </p>
          </div>
          <Link
            href="/blog/page/1"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            Browse the full archive &rarr;
          </Link>
        </div>

        <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {latestPosts.map((post) => (
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

      <section className="py-16 md:py-20" aria-labelledby="featured-writing">
        <h2
          id="featured-writing"
          className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
        >
          Start here
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {featuredPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-lg border border-gray-200 p-6 dark:border-gray-800"
            >
              <time dateTime={post.date} className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(post.date, siteMetadata.locale)}
              </time>
              {post.draft && (
                <p className="mt-2 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                  Local draft preview
                </p>
              )}
              <h3 className="mt-2 text-xl leading-8 font-bold tracking-tight">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{post.summary}</p>
              <div className="mt-4 flex flex-wrap">
                {post.tags?.slice(0, 3).map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tags/${slug(tag)}/page/1`}
                    className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mr-3 text-sm font-medium uppercase"
                  >
                    {tag.split(" ").join("-")}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="border-t border-gray-200 py-16 dark:border-gray-800"
        aria-labelledby="selected-essays"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2
              id="selected-essays"
              className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              More selected essays
            </h2>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
              A curated path through the deeper technical archive.
            </p>
          </div>
          <Link
            href="/blog/page/1"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            Browse the full archive &rarr;
          </Link>
        </div>

        <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {moreSelectedPosts.map((post) => (
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
    </>
  );
}
