import { genPageMetadata } from "app/seo";
import Link from "@/components/Link";
import WorkEntry from "@/components/WorkEntry";
import { deepWork, earlierWork, professionalWork } from "@/data/workData";

export const metadata = genPageMetadata({
  title: "Work",
  description:
    "Engineering work by Mehdi Akiki, described by problem: how far down the stack each one went, what changed, and where the evidence is.",
});

export default function Work() {
  return (
    <>
      <div className="max-w-3xl pt-8 pb-12 md:pt-12 md:pb-16">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl dark:text-gray-100">
          Work
        </h1>
        <p className="mt-5 text-xl leading-8 text-gray-600 dark:text-gray-400">
          Each entry starts with the problem, then how far down the stack it went, what I changed or
          decided, and where you can check the evidence.
        </p>
      </div>

      <section aria-labelledby="deep-work">
        <div className="max-w-3xl pb-4">
          <h2
            id="deep-work"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Investigations and upstream work
          </h2>
          <p className="mt-3 text-lg leading-7 text-gray-600 dark:text-gray-400">
            Work where the evidence is public: merged compiler changes, retained experiments, and an
            open-source crate.
          </p>
        </div>

        {deepWork.map((item) => (
          <WorkEntry key={item.id} item={item} />
        ))}
      </section>

      <section className="pt-14" aria-labelledby="professional-work">
        <div className="max-w-3xl pb-4">
          <h2
            id="professional-work"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Professional work
          </h2>
          <p className="mt-3 text-lg leading-7 text-gray-600 dark:text-gray-400">
            Product and client systems. Where the code is proprietary, the entry stays with what can
            be said publicly.
          </p>
        </div>

        {professionalWork.map((item) => (
          <WorkEntry key={item.id} item={item} />
        ))}
      </section>

      <section className="pt-14" aria-labelledby="smaller-upstream">
        <div className="max-w-3xl">
          <h2
            id="smaller-upstream"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Smaller upstream contributions
          </h2>
          <p className="mt-3 text-lg leading-7 text-gray-600 dark:text-gray-400">
            Front-end compiler fixes, a Deno runtime op, and rust-analyzer changes, each with the
            problem it solved.
          </p>
          <Link
            href="/open-source"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-4 inline-block font-medium"
          >
            See all merged pull requests &rarr;
          </Link>
        </div>
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
