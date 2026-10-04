import { allBlogs, type Blog } from "contentlayer/generated";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { formatDate } from "pliny/utils/formatDate";
import Link from "@/components/IntentLink";
import { PersonJsonLd, WebsiteJsonLd } from "@/components/JsonLd";
import { featuredWritingSlugs } from "@/data/featuredWriting";
import siteMetadata from "@/data/siteMetadata";
import { genPageMetadata } from "app/seo";
import { filterVisiblePosts } from "lib/publication.mjs";
import { filterWritingPosts } from "lib/content-format.mjs";

export const metadata = genPageMetadata({
  title: "Mehdi Akiki",
  description:
    "Software engineer. Problems followed down through frameworks, runtimes, compilers and the machine, with the evidence for each.",
});

const descents = [
  {
    layer: "Compiler · rust-lang/rust",
    title: "A linker question that changed what goes inside a Rust rlib",
    description:
      "rustc guessed which archive members were Rust object files from their names. Four merged pull requests added a late metadata member that the linker reads instead.",
    href: "/work/rustc-late-metadata",
  },
  {
    layer: "Framework · this site",
    title: "A slow page that ended in the Next.js router's scheduler",
    description:
      "Making this site faster went through bundler settings, Flight payloads and the prefetch protocol, until I reproduced a scheduler bug in Next.js. Many faster-looking changes were rejected on the way.",
    href: "/work/site-performance-lab",
  },
  {
    layer: "Machine · Rust",
    title: "One small value, followed down to the register",
    description:
      "One u8 through HIR, MIR, LLVM IR and assembly, to see which parts of a type survive compilation and which only exist for the checker.",
    href: "/blog/does-a-type-exist-at-runtime-following-one-value-from-source-to-register",
  },
];

const professionalEvidence = [
  {
    title: "Inferal",
    label: "Founding engineer",
    description:
      "Working across the core engine, the ontology system, and Relay, the data-synchronization capability I built from the ground up.",
    href: "/work#inferal",
  },
  {
    title: "MonitorMe",
    label: "Founder",
    description:
      "Built an open-source observability framework as a startup product and delivered it into client environments.",
    href: "/work#monitorme",
  },
  {
    title: "Financial and healthcare systems",
    label: "Consulting",
    description:
      "Delivered latency-sensitive financial software and secure healthcare data-processing systems.",
    href: "/work#consulting-work",
  },
];

export default function Home() {
  const posts = allCoreContent(sortPosts(filterWritingPosts(filterVisiblePosts<Blog>(allBlogs))));
  const featuredPosts = featuredWritingSlugs
    .map((slug) => posts.find((post) => post.slug === slug))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));

  return (
    <>
      <WebsiteJsonLd />
      <PersonJsonLd />

      <section className="max-w-5xl pt-12 pb-16 md:pt-20 md:pb-24">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.18em] uppercase">
          Mehdi Akiki
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl leading-tight font-bold tracking-tight text-gray-950 sm:text-5xl md:text-7xl dark:text-gray-50">
          I turn difficult technical problems into dependable systems.
        </h1>
        <p className="mt-7 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          I am a software engineer. The work I value most started as an ordinary question and ended
          a few layers lower than I expected. Here are three of them, with the evidence underneath.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            href="/work"
            className="hover:bg-primary-600 dark:hover:bg-primary-400 rounded-md bg-gray-950 px-5 py-3 font-semibold text-white transition-colors dark:bg-white dark:text-gray-950"
          >
            Explore my work
          </Link>
          <Link
            href="/open-source"
            className="hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 rounded-md border border-gray-300 px-5 py-3 font-semibold text-gray-800 transition-colors dark:border-gray-700 dark:text-gray-200"
          >
            Open-source engineering
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="descents"
        className="border-y border-gray-200 py-10 dark:border-gray-800"
      >
        <h2 id="descents" className="sr-only">
          Three problems followed down the stack
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {descents.map((descent) => (
            <Link
              key={descent.href}
              href={descent.href}
              className="group hover:border-primary-400 dark:hover:border-primary-500 flex flex-col rounded-lg border border-gray-200 p-6 transition-colors dark:border-gray-800"
            >
              <p className="text-primary-600 dark:text-primary-400 text-xs font-semibold tracking-wide uppercase">
                {descent.layer}
              </p>
              <h3 className="group-hover:text-primary-600 dark:group-hover:text-primary-400 mt-3 text-xl leading-7 font-bold text-gray-950 dark:text-gray-100">
                {descent.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
                {descent.description}
              </p>
              <span className="text-primary-600 dark:text-primary-400 mt-auto pt-5 text-sm font-semibold">
                See the evidence &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-24" aria-labelledby="selected-work">
        <div className="max-w-3xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            Professional evidence
          </p>
          <h2
            id="selected-work"
            className="mt-3 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl dark:text-gray-100"
          >
            Work with consequences beyond the code
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            The strongest work is not defined by a framework. It is defined by the constraints,
            decisions, and operational responsibility around it.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {professionalEvidence.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group hover:border-primary-400 dark:hover:border-primary-500 rounded-lg border border-gray-200 p-6 transition-colors dark:border-gray-800"
            >
              <p className="text-primary-600 dark:text-primary-400 text-xs font-semibold tracking-wide uppercase">
                {item.label}
              </p>
              <h3 className="group-hover:text-primary-600 dark:group-hover:text-primary-400 mt-3 text-xl font-bold text-gray-950 dark:text-gray-100">
                {item.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{item.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-7">
          <Link
            href="/work"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            See the evidence and decisions behind the work &rarr;
          </Link>
        </div>
      </section>

      <section
        className="border-y border-gray-200 py-16 md:py-20 dark:border-gray-800"
        aria-labelledby="open-source-work"
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start">
          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
              Independent validation
            </p>
            <h2
              id="open-source-work"
              className="mt-3 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl dark:text-gray-100"
            >
              Compilers, runtimes, and original systems work
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-400">
              My open-source work includes ten merged pull requests to rust-lang/rust, contributions
              to Deno and rust-analyzer, and Bitarena, a data structure designed around sparse
              iteration, stable handles, and explicit performance tradeoffs.
            </p>
          </div>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              <strong className="text-gray-950 dark:text-gray-100">rust-lang/rust:</strong> linker
              and crate metadata, a coherence crash fix, attribute parsing, and tooling.
            </p>
            <p>
              <strong className="text-gray-950 dark:text-gray-100">Deno and rust-analyzer:</strong>{" "}
              runtime performance, web-platform behavior, and editor tooling.
            </p>
            <p>
              <strong className="text-gray-950 dark:text-gray-100">Bitarena:</strong> original Rust
              systems design with documented invariants, benchmarks, and Miri in CI.
            </p>
            <Link
              href="/open-source"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-block pt-2 font-semibold"
            >
              Review the contributions &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" aria-labelledby="selected-writing">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
              Selected writing
            </p>
            <h2
              id="selected-writing"
              className="mt-3 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl dark:text-gray-100"
            >
              Engineering from the underlying model up
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            All writing &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {featuredPosts.map((post) => (
            <article key={post.slug} className="border-t border-gray-200 pt-5 dark:border-gray-800">
              <time className="text-sm text-gray-500 dark:text-gray-400" dateTime={post.date}>
                {formatDate(post.date, siteMetadata.locale)}
              </time>
              <h3 className="mt-2 text-xl leading-8 font-bold tracking-tight">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{post.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 py-12 dark:border-gray-800">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <p className="max-w-2xl text-lg leading-8 text-gray-700 dark:text-gray-300">
            I care about clear models, measurable behavior, and systems the next engineer can still
            understand.
          </p>
          <div className="flex gap-5">
            <Link
              href="/about"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            >
              About me
            </Link>
            <Link
              href="/contact"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
