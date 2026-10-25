import "server-only";
import { allBlogs } from "contentlayer/generated";
import { editorialSeriesForPost } from "@/data/editorial-series.mjs";
import { publishedSeriesParts } from "lib/editorial-navigation.mjs";
import Link from "./Link";

export default function EditorialSeriesNav({ slug }: { slug: string }) {
  const series = editorialSeriesForPost(slug);
  if (!series) return null;
  const parts = publishedSeriesParts(series, allBlogs);
  if (parts.length === 0) return null;
  return (
    <nav
      className="not-prose my-10 rounded-lg border border-gray-200 p-6 dark:border-gray-800"
      aria-label="Articles in this series"
    >
      <h2 className="text-lg font-semibold">
        <Link href={`/blog/series/${series.slug}`}>{series.title}</Link>
      </h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5">
        {parts.map((part) => (
          <li key={part.slug}>
            {part.slug === slug ? (
              <span aria-current="page">{part.title}</span>
            ) : (
              <Link href={`/blog/${part.slug}`}>{part.title}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
