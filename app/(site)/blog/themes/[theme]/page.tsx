import { allBlogs, type Blog } from "contentlayer/generated";
import { allCoreContent } from "pliny/utils/contentlayer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import Link from "@/components/Link";
import siteMetadata from "@/data/siteMetadata";
import {
  articleSlugsForTheme,
  getWritingTheme,
  investigationHref,
  investigationsForTheme,
  referenceSlugsForTheme,
  writingThemes,
} from "@/data/writing-tiers.mjs";
import { filterWritingPosts } from "lib/content-format.mjs";
import { filterVisiblePosts } from "lib/publication.mjs";

type PageProps = { params: Promise<{ theme: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return writingThemes.map((theme) => ({ theme: theme.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata | undefined> {
  const { theme: themeSlug } = await params;
  const theme = getWritingTheme(themeSlug);
  if (!theme) return;

  const path = `/blog/themes/${theme.slug}`;
  return {
    title: theme.title,
    description: theme.description,
    alternates: { canonical: path },
    openGraph: {
      title: theme.title,
      description: theme.description,
      type: "website",
      url: path,
    },
  };
}

export default async function WritingThemePage({ params }: PageProps) {
  const { theme: themeSlug } = await params;
  const theme = getWritingTheme(themeSlug);
  if (!theme) return notFound();

  const postsBySlug = new Map(
    allCoreContent(filterWritingPosts(filterVisiblePosts<Blog>(allBlogs))).map((post) => [
      post.slug,
      post,
    ])
  );
  const pick = (slugs: string[]) =>
    slugs
      .map((postSlug) => postsBySlug.get(postSlug))
      .filter((post): post is NonNullable<typeof post> => Boolean(post));

  const themeInvestigations = investigationsForTheme(theme.slug)
    .filter(
      (investigation) => investigation.parts.length === 0 || postsBySlug.has(investigation.parts[0])
    )
    .map((investigation) => ({
      ...investigation,
      href: investigationHref(investigation),
      partPosts: pick(investigation.parts),
    }));
  const articles = pick(articleSlugsForTheme(theme.slug));
  const referencePosts = pick(referenceSlugsForTheme(theme.slug));
  const pageUrl = `${siteMetadata.siteUrl}/blog/themes/${theme.slug}`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Writing", url: `${siteMetadata.siteUrl}/blog` },
          { name: theme.title, url: pageUrl },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: theme.title,
          description: theme.description,
          url: pageUrl,
          author: { "@type": "Person", name: siteMetadata.author, url: siteMetadata.siteUrl },
          hasPart: [
            ...themeInvestigations.flatMap((investigation) => investigation.partPosts),
            ...articles,
          ].map((post) => ({
            "@type": "Article",
            name: post.title,
            url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
          })),
        }}
      />

      <header className="max-w-4xl pt-8 pb-12 md:pt-12 md:pb-16">
        <Link
          href="/blog"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-semibold tracking-[0.16em] uppercase"
        >
          Writing / {theme.label}
        </Link>
        <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-5xl dark:text-gray-100">
          {theme.title}
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          {theme.description}
        </p>
        <nav aria-label="Other themes" className="mt-8">
          <ul className="flex flex-wrap gap-3">
            {writingThemes.map((otherTheme) => (
              <li key={otherTheme.slug}>
                {otherTheme.slug === theme.slug ? (
                  <span
                    aria-current="page"
                    className="border-primary-500 text-primary-700 dark:border-primary-400 dark:text-primary-300 inline-block rounded-full border px-4 py-2 text-sm font-semibold"
                  >
                    {otherTheme.label}
                  </span>
                ) : (
                  <Link
                    href={`/blog/themes/${otherTheme.slug}`}
                    className="hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 inline-block rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
                  >
                    {otherTheme.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {themeInvestigations.length > 0 && (
        <section
          className="border-t border-gray-200 py-12 md:py-14 dark:border-gray-800"
          aria-labelledby="theme-investigations"
        >
          <h2
            id="theme-investigations"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Investigations
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {themeInvestigations.map((investigation) => (
              <article
                key={investigation.slug}
                className="flex flex-col rounded-lg border border-gray-200 p-6 dark:border-gray-800"
              >
                {investigation.partPosts.length > 0 && (
                  <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.12em] uppercase">
                    {investigation.partPosts.length} parts
                  </p>
                )}
                <h3 className="mt-2 text-xl leading-8 font-bold tracking-tight">
                  <Link
                    href={investigation.href}
                    className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                    data-umami-event="theme-investigation-click"
                    data-umami-event-theme={theme.slug}
                    data-umami-event-investigation={investigation.slug}
                  >
                    {investigation.title}
                  </Link>
                </h3>
                <p className="mt-3 flex-1 leading-7 text-gray-600 dark:text-gray-400">
                  {investigation.summary}
                </p>
                {investigation.evidence && (
                  <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    Evidence:{" "}
                    <code className="text-gray-700 dark:text-gray-300">
                      {investigation.evidence}
                    </code>
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section
          className="border-t border-gray-200 py-12 md:py-14 dark:border-gray-800"
          aria-labelledby="theme-articles"
        >
          <h2
            id="theme-articles"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Articles
          </h2>
          <ul className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {articles.map((post) => (
              <li key={post.slug} className="py-5">
                <article>
                  <h3 className="text-lg leading-7 font-bold">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                      data-umami-event="theme-article-click"
                      data-umami-event-theme={theme.slug}
                    >
                      {post.title}
                    </Link>
                  </h3>
                  {post.summary && (
                    <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                      {post.summary}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      {referencePosts.length > 0 && (
        <section
          className="border-t border-gray-200 py-12 md:py-14 dark:border-gray-800"
          aria-labelledby="theme-reference"
        >
          <h2
            id="theme-reference"
            className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Shorter pieces and reference
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
            Older, introductory or narrower pieces on the same subject.
          </p>
          <ul className="mt-6 grid gap-x-8 md:grid-cols-2">
            {referencePosts.map((post) => (
              <li key={post.slug} className="border-b border-gray-200 py-3 dark:border-gray-800">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 leading-6 text-gray-700 dark:text-gray-300"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-gray-200 py-12 dark:border-gray-800">
        <Link
          href="/blog/page/1"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
        >
          Browse the full archive &rarr;
        </Link>
      </section>
    </>
  );
}
