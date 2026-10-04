export interface Contribution {
  number: number;
  title: string;
  /** The engineering problem behind the change, in one or two sentences. */
  problem: string;
  href: string;
  merged: string;
}

export const rustLinkingContributions: Contribution[] = [
  {
    number: 154861,
    title: "Add rlib digest to identify Rust object files",
    problem:
      "During LTO, rustc decided which rlib members were Rust object files from their file names, which a bundled native library can imitate. The archive now lists them in a link-time metadata member, and the heuristic is gone.",
    href: "https://github.com/rust-lang/rust/pull/154861",
    merged: "2026-05-05",
  },
  {
    number: 156735,
    title: "Move NativeLib filename metadata into the rmeta-link archive member",
    problem:
      "Bundled native library filenames are only needed at link time but were decoded with the crate metadata. They moved into the link-time member, and only the linking code reads them.",
    href: "https://github.com/rust-lang/rust/pull/156735",
    merged: "2026-07-11",
  },
  {
    number: 158194,
    title: "Add a path-keyed per-link cache for decoded rmeta-link members",
    problem:
      "With link-time data in its own member, one link could decode the same rlib's member repeatedly. A cache keyed by path decodes each one at most once per link.",
    href: "https://github.com/rust-lang/rust/pull/158194",
    merged: "2026-06-28",
  },
  {
    number: 159571,
    title: "Remove an unused bundled-library lookup for the local crate",
    problem:
      "After the previous change, a branch computed filenames for the local crate that nothing read. Cleanup only, no change in behavior.",
    href: "https://github.com/rust-lang/rust/pull/159571",
    merged: "2026-07-20",
  },
];

export const rustLanguageAndToolingContributions: Contribution[] = [
  {
    number: 161692,
    title: "Fix a compiler crash on Unpin impls for local extern types",
    problem:
      "The Unpin impl check only handled ADTs, so an impl for a local extern type, which the orphan check allows, reached a delayed bug and crashed the compiler (issue #155053). A two-line fix in coherence checking, with a UI test.",
    href: "https://github.com/rust-lang/rust/pull/161692",
    merged: "2026-08-29",
  },
  {
    number: 154070,
    title: "Generate the Unstable Book's -Z options from the compiler source",
    problem:
      "Documentation tooling: it parses the options! macro in the compiler's source to extract the unstable flag names and descriptions, instead of parsing the output of rustc -Zhelp.",
    href: "https://github.com/rust-lang/rust/pull/154070",
    merged: "2026-03-28",
  },
  {
    number: 153980,
    title: "Move the doc(rust_logo) check into the parser",
    problem:
      "Moved the #[doc(rust_logo)] feature gate from the general attribute checker into the doc attribute parser.",
    href: "https://github.com/rust-lang/rust/pull/153980",
    merged: "2026-03-31",
  },
  {
    number: 153582,
    title: "Simplify find_attr! for HirId usage",
    problem:
      "find_attr! required callers to fetch an attribute slice first. A HasAttrs trait lets it take DefId, LocalDefId, OwnerId or HirId directly; the trait is generic so rustc_hir does not depend on rustc_middle (issue #153103).",
    href: "https://github.com/rust-lang/rust/pull/153582",
    merged: "2026-03-23",
  },
  {
    number: 153073,
    title: "Show the concrete type name in the mem::conjure_zst panic message",
    problem:
      "A standard library change, not a compiler one: the panic message printed the literal [T] instead of the actual type name.",
    href: "https://github.com/rust-lang/rust/pull/153073",
    merged: "2026-02-28",
  },
  {
    number: 95454,
    title: "Only print -Ztime-passes entries above five milliseconds",
    problem:
      "-Ztime-passes printed every compiler pass, most of them too short to matter. It now prints only passes that take more than 5 ms (issue #95444).",
    href: "https://github.com/rust-lang/rust/pull/95454",
    merged: "2022-05-06",
  },
];

export const denoContributions: Contribution[] = [
  {
    number: 14217,
    title: "Add a fast path for non-streaming TextDecoder calls",
    problem:
      "A one-shot TextDecoder.decode() created a decoder resource in Rust, used it once, and closed it. The fast path does the whole decode in a single op.",
    href: "https://github.com/denoland/deno/pull/14217",
    merged: "2022-05-17",
  },
  {
    number: 14415,
    title: "Add userAgent to Navigator's prototype",
    problem:
      "navigator.userAgent was missing. The user agent now travels through the runtime's bootstrap options to Navigator's prototype (issue #14362).",
    href: "https://github.com/denoland/deno/pull/14415",
    merged: "2022-05-14",
  },
];

export const rustAnalyzerContributions: Contribution[] = [
  {
    number: 17392,
    title: "Align the internal Length name with Len",
    problem: "Renamed an internal Length to Len for consistency (issue #17242).",
    href: "https://github.com/rust-lang/rust-analyzer/pull/17392",
    merged: "2024-06-11",
  },
  {
    number: 13207,
    title: "Add semicolon completion for module declarations",
    problem:
      "Completion did not offer the semicolon after a module declaration (issue #13196). Added it, with a test.",
    href: "https://github.com/rust-lang/rust-analyzer/pull/13207",
    merged: "2022-09-09",
  },
  {
    number: 12118,
    title: "Rename crates consistently to kebab-case",
    problem:
      "Renamed the project's crate folders and Cargo.toml names to kebab-case (issue #12102).",
    href: "https://github.com/rust-lang/rust-analyzer/pull/12118",
    merged: "2022-05-01",
  },
];
