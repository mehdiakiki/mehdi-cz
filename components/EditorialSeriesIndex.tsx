import "server-only";
import { allBlogs } from "contentlayer/generated";
import { availableEditorialSeries, publishedSeriesParts } from "lib/editorial-navigation.mjs";
import Link from "./Link";

export default function EditorialSeriesIndex() {
  const series = availableEditorialSeries(allBlogs);
  if (series.length === 0) return null;
  return (
    <section className="border-t border-gray-200 py-12 dark:border-gray-800" aria-labelledby="practical-series-title">
      <h2 id="practical-series-title" className="text-3xl font-bold tracking-tight">Practical series</h2>
      <ul className="mt-6 grid gap-6 md:grid-cols-3">
        {series.map((item) => (
          <li key={item.slug}>
            <h3 className="text-lg font-semibold">
              <Link href={`/blog/series/${item.slug}`}>{item.title}</Link>
            </h3>
            <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">{item.description}</p>
            <p className="mt-2 text-sm text-gray-500">{publishedSeriesParts(item, allBlogs).length} published articles</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
