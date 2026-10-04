import { genPageMetadata } from "app/seo";
import Link from "@/components/Link";
import WorkEntry from "@/components/WorkEntry";
import { consultingWork, earlierWork, featuredWork, independentWork } from "@/data/workData";

export const metadata = genPageMetadata({
  title: "Work",
  description:
    "Selected engineering work by Mehdi Akiki across startup products, financial and healthcare systems, distributed infrastructure, and open-source systems.",
});

export default function Work() {
  return (
    <>
      <div className="max-w-3xl pt-8 pb-12 md:pt-12 md:pb-16">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl dark:text-gray-100">
          Work
        </h1>
        <p className="mt-5 text-xl leading-8 text-gray-600 dark:text-gray-400">
          Selected engineering work, with the context, ownership, and decisions behind the systems I
          helped bring into production.
        </p>
      </div>

      <section aria-labelledby="featured-work">
        <div className="max-w-3xl pb-4">
          <h2
            id="featured-work"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Featured professional work
          </h2>
          <p className="mt-3 text-lg leading-7 text-gray-600 dark:text-gray-400">
            Product and systems work where the responsibility extended from technical decisions to
            making the result usable in real environments.
          </p>
        </div>

        {featuredWork.map((item) => (
          <WorkEntry key={item.title} item={item} />
        ))}
      </section>

      <section className="pt-14" aria-labelledby="consulting-work">
        <div className="max-w-3xl pb-4">
          <h2
            id="consulting-work"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Selected consulting engagements
          </h2>
          <p className="mt-3 text-lg leading-7 text-gray-600 dark:text-gray-400">
            Systems delivered inside financial and healthcare environments with material
            performance, reliability, privacy, and operational constraints.
          </p>
        </div>

        {consultingWork.map((item) => (
          <WorkEntry key={item.title} item={item} />
        ))}
      </section>

      <section className="pt-14" aria-labelledby="independent-work">
        <div className="max-w-3xl pb-4">
          <h2
            id="independent-work"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Independent systems and open source
          </h2>
          <p className="mt-3 text-lg leading-7 text-gray-600 dark:text-gray-400">
            Original systems work and accepted contributions to compilers, runtimes, and developer
            tooling.
          </p>
        </div>

        {independentWork.map((item) => (
          <WorkEntry key={item.title} item={item} />
        ))}
      </section>

      <section className="pt-14" aria-labelledby="earlier-work">
        <h2
          id="earlier-work"
          className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
        >
          Earlier engineering work
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {earlierWork.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group hover:border-primary-400 dark:hover:border-primary-500 rounded-lg border border-gray-200 p-5 transition-colors dark:border-gray-800"
            >
              <h3 className="group-hover:text-primary-600 dark:group-hover:text-primary-400 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {item.title}
              </h3>
              <p className="mt-2 leading-6 text-gray-600 dark:text-gray-400">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-gray-200 py-10 dark:border-gray-800">
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Looking for more context? Read more about how I work or get in touch.
        </p>
        <div className="mt-4 flex flex-wrap gap-5">
          <Link
            href="/how-i-work"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            How I work &rarr;
          </Link>
          <Link
            href="/contact"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            Get in touch &rarr;
          </Link>
        </div>
      </section>
    </>
  );
}
