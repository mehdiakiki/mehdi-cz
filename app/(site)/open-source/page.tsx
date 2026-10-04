import Link from "@/components/Link";
import {
  denoContributions,
  rustAnalyzerContributions,
  rustLanguageAndToolingContributions,
  rustLinkingContributions,
  type Contribution,
} from "@/data/openSourceData";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Open Source",
  description:
    "Merged open-source work by Mehdi Akiki in rust-lang/rust, Deno and rust-analyzer, and the Bitarena crate, with the problem behind each change.",
});

function ContributionList({ contributions }: { contributions: Contribution[] }) {
  return (
    <ul className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {contributions.map((contribution) => (
        <li
          key={contribution.href}
          className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
        >
          <div>
            <Link
              href={contribution.href}
              className="hover:text-primary-600 dark:hover:text-primary-400 font-medium text-gray-900 dark:text-gray-100"
            >
              {contribution.title} <span className="text-gray-400">#{contribution.number}</span>
            </Link>
            <p className="mt-1 leading-7 text-gray-600 dark:text-gray-400">
              {contribution.problem}
            </p>
          </div>
          <time
            dateTime={contribution.merged}
            className="text-sm text-gray-500 tabular-nums dark:text-gray-400"
          >
            Merged {contribution.merged}
          </time>
        </li>
      ))}
    </ul>
  );
}

export default function OpenSource() {
  return (
    <>
      <header className="max-w-4xl pt-8 pb-14 md:pt-12 md:pb-20">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Original and contributed systems work
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Open source
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          Merged changes in rust-lang/rust, Deno and rust-analyzer, and an original Rust crate. Each
          change is listed with the problem it solved, so the scope is clear before you open the
          pull request.
        </p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Contribution counts and merge status verified against GitHub on October 4, 2026.
        </p>
      </header>

      <section
        className="border-y border-gray-200 py-12 dark:border-gray-800"
        aria-labelledby="bitarena"
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
              Original systems work
            </p>
            <h2 id="bitarena" className="mt-2 text-3xl font-bold text-gray-950 dark:text-gray-100">
              Bitarena
            </h2>
          </div>
          <div>
            <p className="text-lg leading-8 text-gray-700 dark:text-gray-300">
              A bitset-accelerated generational arena designed for stable handles and fast sweeps
              over sparse tables. Its design documents the safety invariants, benchmark methodology,
              and workloads where another representation is the better choice.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
              <Link
                href="/work/bitarena"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
              >
                Read the case study &rarr;
              </Link>
              <Link
                href="https://github.com/mehdiakiki/bitarena"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
              >
                Inspect the repository &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="rust-compiler">
        <div className="max-w-3xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
            10 merged pull requests
          </p>
          <h2
            id="rust-compiler"
            className="mt-2 text-3xl font-bold text-gray-950 dark:text-gray-100"
          >
            rust-lang/rust
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Eight are compiler changes, one is in the core library, and one is documentation tooling
            that reads the compiler&apos;s option definitions. The linking and metadata series is
            the deepest of them, and it has{" "}
            <Link
              href="/work/rustc-late-metadata"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              its own case study
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-xl font-bold text-gray-950 dark:text-gray-100">
              Linking and crate metadata
            </h3>
            <ContributionList contributions={rustLinkingContributions} />
          </div>
          <div>
            <h3 className="mb-4 text-xl font-bold text-gray-950 dark:text-gray-100">
              Front-end fixes, library, and tooling
            </h3>
            <ContributionList contributions={rustLanguageAndToolingContributions} />
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 py-16 md:py-20 dark:border-gray-800">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
              2 merged pull requests
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-950 dark:text-gray-100">Deno</h2>
            <p className="mt-4 mb-7 leading-7 text-gray-600 dark:text-gray-400">
              Focused changes to web-platform behavior and a performance-sensitive decoding path.
            </p>
            <ContributionList contributions={denoContributions} />
          </div>

          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
              3 merged pull requests
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-950 dark:text-gray-100">
              rust-analyzer
            </h2>
            <p className="mt-4 mb-7 leading-7 text-gray-600 dark:text-gray-400">
              Editor behavior and consistency changes inside Rust language tooling.
            </p>
            <ContributionList contributions={rustAnalyzerContributions} />
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 py-12 dark:border-gray-800">
        <p className="max-w-3xl text-lg leading-8 text-gray-700 dark:text-gray-300">
          Most of these are small. The linking and metadata series is not: it changed the format of
          a compiler artifact and went through several rounds of review.
        </p>
        <Link
          href="/work"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-5 inline-block font-semibold"
        >
          Return to selected work &rarr;
        </Link>
      </section>
    </>
  );
}
