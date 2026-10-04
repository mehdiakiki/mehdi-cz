import { formatDate } from "pliny/utils/formatDate";
import { CoreContent } from "pliny/utils/contentlayer";
import type { Blog } from "contentlayer/generated";
import Link from "@/components/Link";
import siteMetadata from "@/data/siteMetadata";
import {
  getWritingTheme,
  investigationPartOf,
  writingThemeOf,
  writingThemes,
  writingTier,
  writingTierLabels,
} from "@/data/writing-tiers.mjs";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

interface ListLayoutProps {
  posts: CoreContent<Blog>[];
  title: string;
  description?: string;
  initialDisplayPosts?: CoreContent<Blog>[];
  pagination?: PaginationProps;
  basePath: string;
}

function Pagination({ totalPages, currentPage, basePath }: PaginationProps & { basePath: string }) {
  const prevPage = currentPage - 1 > 0;
  const nextPage = currentPage + 1 <= totalPages;

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <nav className="flex justify-between">
        {!prevPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            Previous
          </button>
        )}
        {prevPage && (
          <Link href={`${basePath}/page/${currentPage - 1}`} rel="prev">
            Previous
          </Link>
        )}
        <span>
          {currentPage} of {totalPages}
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            Next
          </button>
        )}
        {nextPage && (
          <Link href={`${basePath}/page/${currentPage + 1}`} rel="next">
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}

function PostLabel({ post }: { post: CoreContent<Blog> }) {
  const tier = writingTier(post);
  const part = investigationPartOf(post);
  const theme = getWritingTheme(writingThemeOf(post));
  const details = part
    ? `Part ${part.index + 1} of ${part.investigation.parts.length} · ${part.investigation.title}`
    : theme?.label;
  const tierClass =
    tier === "reference"
      ? "text-gray-500 dark:text-gray-400"
      : "text-primary-700 dark:text-primary-300";

  return (
    <p className="text-xs font-semibold tracking-[0.12em] uppercase">
      <span className={tierClass}>{writingTierLabels[tier]}</span>
      {details && <span className="text-gray-500 dark:text-gray-400"> · {details}</span>}
    </p>
  );
}

function ThemeNavigation({ basePath }: { basePath: string }) {
  const linkClass =
    "hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium text-gray-600 dark:text-gray-300";
  const isArchive = basePath === "/blog";

  return (
    <nav aria-label="Writing" className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
          Writing
        </h2>
        <ul className="mt-3 space-y-2">
          <li>
            <Link href="/blog" className={linkClass}>
              Investigations and articles
            </Link>
          </li>
          <li>
            {isArchive ? (
              <span
                aria-current="page"
                className="text-primary-700 dark:text-primary-300 text-sm font-semibold"
              >
                Full archive
              </span>
            ) : (
              <Link href="/blog/page/1" className={linkClass}>
                Full archive
              </Link>
            )}
          </li>
          <li>
            <Link href="/notes" className={linkClass}>
              Engineering notes
            </Link>
          </li>
        </ul>
      </div>
      <div>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-gray-500 uppercase dark:text-gray-400">
          Themes
        </h2>
        <ul className="mt-3 space-y-3">
          {writingThemes.map((theme) => (
            <li key={theme.slug}>
              <Link href={`/blog/themes/${theme.slug}`} className={linkClass}>
                {theme.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default function ListLayoutWithTags({
  posts,
  title,
  description,
  initialDisplayPosts = [],
  pagination,
  basePath,
}: ListLayoutProps) {
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts;

  return (
    <div>
      <div className="pt-6 pb-8">
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 dark:text-gray-100">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-3xl leading-7 text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      <div className="flex sm:space-x-16">
        <div className="hidden h-full max-w-[260px] min-w-[260px] rounded bg-gray-50 px-6 py-6 sm:block dark:bg-gray-900/70">
          <ThemeNavigation basePath={basePath} />
        </div>
        <div className="min-w-0 flex-1">
          <nav aria-label="Writing themes" className="mb-4 sm:hidden">
            <ul className="flex flex-wrap gap-2">
              {writingThemes.map((theme) => (
                <li key={theme.slug}>
                  <Link
                    href={`/blog/themes/${theme.slug}`}
                    className="inline-block rounded-full border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                  >
                    {theme.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ul>
            {displayPosts.map((post) => {
              const { path, date, title, summary } = post;
              const isReference = writingTier(post) === "reference";
              return (
                <li key={path} className="py-5">
                  <article className="flex flex-col space-y-2 xl:space-y-0">
                    <dl>
                      <dt className="sr-only">Published on</dt>
                      <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                        <time dateTime={date} suppressHydrationWarning>
                          {formatDate(date, siteMetadata.locale)}
                        </time>
                      </dd>
                    </dl>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <PostLabel post={post} />
                        <h2
                          className={
                            isReference
                              ? "text-xl leading-7 font-semibold tracking-tight"
                              : "text-2xl leading-8 font-bold tracking-tight"
                          }
                        >
                          <Link href={`/${path}`} className="text-gray-900 dark:text-gray-100">
                            {title}
                          </Link>
                        </h2>
                      </div>
                      <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                        {summary}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              basePath={basePath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
