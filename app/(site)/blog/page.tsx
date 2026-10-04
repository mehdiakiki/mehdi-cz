import { allBlogs, type Blog } from "contentlayer/generated";
import { allCoreContent } from "pliny/utils/contentlayer";
import Link from "@/components/WritingIndexIntentLink";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { contentClusters } from "@/data/content-clusters.mjs";
import siteMetadata from "@/data/siteMetadata";
import {
  articleSlugsForTheme,
  getWritingTheme,
  investigationHref,
  investigations,
  investigationsForTheme,
  writingThemes,
} from "@/data/writing-tiers.mjs";
import { genPageMetadata } from "app/seo";
import { filterVisiblePosts } from "lib/publication.mjs";
import { filterNotePosts, filterWritingPosts } from "lib/content-format.mjs";

const articlesShownPerTheme = 5;

export const metadata = genPageMetadata({
  title: "Writing",
  description:
    "Investigations and articles by Mehdi Akiki on compilers, runtimes, protocols, build systems and data pipelines, organized around four engineering questions.",
});

export default function Writing() {
  const visiblePosts = filterVisiblePosts<Blog>(allBlogs);
  const writingPosts = filterWritingPosts(visiblePosts);
  const noteCount = filterNotePosts(visiblePosts).length;
  const postsBySlug = new Map(allCoreContent(writingPosts).map((post) => [post.slug, post]));

  const listedInvestigations = investigations
    .filter(
      (investigation) => investigation.parts.length === 0 || postsBySlug.has(investigation.parts[0])
    )
    .map((investigation) => ({
      ...investigation,
      href: investigationHref(investigation),
      partPosts: investigation.parts
        .map((partSlug) => postsBySlug.get(partSlug))
        .filter((post): post is NonNullable<typeof post> => Boolean(post)),
    }));
  const listedSlugs = new Set(listedInvestigations.map((investigation) => investigation.slug));

  const themeSections = writingThemes.map((theme) => {
    const articles = articleSlugsForTheme(theme.slug)
      .map((articleSlug) => postsBySlug.get(articleSlug))
      .filter((post): post is NonNullable<typeof post> => Boolean(post));
    return {
      theme,
      articles: articles.slice(0, articlesShownPerTheme),
      articleCount: articles.length,
      themeInvestigations: investigationsForTheme(theme.slug).filter((investigation) =>
        listedSlugs.has(investigation.slug)
      ),
    };
  });

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Writing", url: `${siteMetadata.siteUrl}/blog` },
        ]}
      />

      <header className="max-w-4xl pt-8 pb-12 md:pt-12 md:pb-16">
        <h1 className="text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Writing
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          The main body of this writing follows one system below its interface: a compiler, a
          runtime, a protocol, a build, a data pipeline. It is organized around four engineering
          questions.
        </p>
        <p className="mt-5 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
          Investigations run over several parts and keep the programs and experiments that produced
          their evidence. Articles stand alone. Shorter notes, beginner material and tool guides
          stay in the{" "}
          <a
            href="#archive"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            archive
          </a>{" "}
          and in search.
        </p>
        <nav aria-label="Writing themes" className="mt-8">
          <ul className="flex flex-wrap gap-3">
            {writingThemes.map((theme) => (
              <li key={theme.slug}>
                <Link
                  href={`/blog/themes/${theme.slug}`}
                  className="hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 inline-block rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200"
                  data-umami-event="writing-theme-click"
                  data-umami-event-theme={theme.slug}
                >
                  {theme.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section
        id="investigations"
        className="scroll-mt-24 border-t border-gray-200 py-14 md:py-16 dark:border-gray-800"
        aria-labelledby="investigations-title"
      >
        <div className="max-w-3xl">
          <h2
            id="investigations-title"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Investigations
          </h2>
          <p className="mt-3 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Multi-part work backed by code, measurements or reproductions that can be run again.
          </p>
        </div>

        <ol className="mt-10 space-y-12">
          {listedInvestigations.map((investigation) => (
            <li key={investigation.slug}>
              <article
                id={`investigation-${investigation.slug}`}
                className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
              >
                <div>
                  <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.12em] uppercase">
                    {getWritingTheme(investigation.themes[0])?.label}
                    {investigation.partPosts.length > 0 &&
                      ` · ${investigation.partPosts.length} parts`}
                  </p>
                  <h3 className="mt-3 text-2xl leading-8 font-bold tracking-tight">
                    <Link
                      href={investigation.href}
                      className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                      data-umami-event="writing-investigation-click"
                      data-umami-event-investigation={investigation.slug}
                    >
                      {investigation.title}
                    </Link>
                  </h3>
                  <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
                    {investigation.summary}
                  </p>
                  {investigation.evidence && (
                    <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      Evidence:{" "}
                      <code className="text-gray-700 dark:text-gray-300">
                        {investigation.evidence}
                      </code>
                    </p>
                  )}
                </div>
                {investigation.partPosts.length > 0 && (
                  <ol className="list-decimal space-y-2 pl-6 text-sm leading-6 text-gray-500 marker:text-gray-400 dark:text-gray-400">
                    {investigation.partPosts.map((part) => (
                      <li key={part.slug}>
                        <Link
                          href={`/blog/${part.slug}`}
                          className="hover:text-primary-600 dark:hover:text-primary-400 font-medium text-gray-800 dark:text-gray-200"
                        >
                          {part.title}
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="articles"
        className="scroll-mt-24 border-t border-gray-200 py-14 md:py-16 dark:border-gray-800"
        aria-labelledby="articles-title"
      >
        <div className="max-w-3xl">
          <h2
            id="articles-title"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Articles
          </h2>
          <p className="mt-3 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Standalone pieces, grouped by the question they answer.
          </p>
        </div>

        <div className="mt-10 space-y-14">
          {themeSections.map(({ theme, articles, articleCount, themeInvestigations }) => (
            <section
              key={theme.slug}
              id={`theme-${theme.slug}`}
              className="scroll-mt-24"
              aria-labelledby={`theme-${theme.slug}-title`}
            >
              <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.12em] uppercase">
                {theme.label}
              </p>
              <h3
                id={`theme-${theme.slug}-title`}
                className="mt-2 text-2xl leading-8 font-bold tracking-tight text-gray-950 dark:text-gray-100"
              >
                {theme.title}
              </h3>
              <p className="mt-2 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">
                {theme.description}
              </p>
              {themeInvestigations.length > 0 && (
                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Investigations:{" "}
                  {themeInvestigations.map((investigation, index) => (
                    <span key={investigation.slug}>
                      {index > 0 && ", "}
                      <a
                        href={`#investigation-${investigation.slug}`}
                        className="hover:text-primary-600 dark:hover:text-primary-400 font-medium text-gray-700 dark:text-gray-300"
                      >
                        {investigation.title}
                      </a>
                    </span>
                  ))}
                </p>
              )}

              {articles.length > 0 && (
                <ul className="mt-6 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  {articles.map((post) => (
                    <li key={post.slug} className="py-5">
                      <article>
                        <h4 className="text-lg leading-7 font-bold">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                            data-umami-event="writing-article-click"
                            data-umami-event-theme={theme.slug}
                          >
                            {post.title}
                          </Link>
                        </h4>
                        {post.summary && (
                          <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                            {post.summary}
                          </p>
                        )}
                      </article>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={`/blog/themes/${theme.slug}`}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-5 inline-block font-semibold"
                data-umami-event="writing-theme-click"
                data-umami-event-theme={theme.slug}
              >
                {articleCount > articles.length
                  ? `All ${articleCount} articles in this theme`
                  : "Everything in this theme"}{" "}
                &rarr;
              </Link>
            </section>
          ))}
        </div>
      </section>

      <section
        id="archive"
        className="scroll-mt-24 border-t border-gray-200 py-14 md:py-16 dark:border-gray-800"
        aria-labelledby="archive-title"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="max-w-3xl">
            <h2
              id="archive-title"
              className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              The archive
            </h2>
            <p className="mt-3 text-lg leading-8 text-gray-600 dark:text-gray-400">
              All {writingPosts.length} published pieces, newest first, each labelled as an
              investigation, an article or reference. Reference covers beginner Rust, framework and
              tool guides, AI explainers, interview preparation and older short pieces. The{" "}
              {noteCount} short engineering notes have their own page.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              <Link
                href="/blog/page/1"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
                data-umami-event="writing-archive-click"
              >
                Browse the archive &rarr;
              </Link>
              <Link
                href="/notes"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
              >
                Engineering notes &rarr;
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-[0.12em] text-gray-500 uppercase dark:text-gray-400">
              Other ways in
            </h3>
            <ul className="mt-4 space-y-3 leading-7">
              <li>
                <Link
                  href="/rust"
                  className="hover:text-primary-600 dark:hover:text-primary-400 font-semibold text-gray-900 dark:text-gray-100"
                  data-umami-event="writing-rust-systems-atlas"
                >
                  Rust Systems Atlas
                </Link>
                <span className="text-gray-600 dark:text-gray-400">
                  : the Rust writing as one map, from compiler internals to async runtimes.
                </span>
              </li>
              {contentClusters.map((cluster) => (
                <li key={cluster.slug}>
                  <Link
                    href={`/blog/topics/${cluster.slug}`}
                    className="hover:text-primary-600 dark:hover:text-primary-400 font-semibold text-gray-900 dark:text-gray-100"
                    data-umami-event="writing-cluster-click"
                    data-umami-event-cluster={cluster.slug}
                  >
                    {cluster.title}
                  </Link>
                  <span className="text-gray-600 dark:text-gray-400">: {cluster.subtitle}.</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
