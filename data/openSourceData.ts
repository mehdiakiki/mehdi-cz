export interface Contribution {
  number: number;
  title: string;
  href: string;
  merged: string;
}

export const rustLinkingContributions: Contribution[] = [
  {
    number: 154861,
    title: "Add rlib digest to identify Rust object files",
    href: "https://github.com/rust-lang/rust/pull/154861",
    merged: "2026-05-05",
  },
  {
    number: 156735,
    title: "Move NativeLib filename metadata into the rmeta-link archive member",
    href: "https://github.com/rust-lang/rust/pull/156735",
    merged: "2026-07-11",
  },
  {
    number: 158194,
    title: "Add a path-keyed per-link cache for decoded rmeta",
    href: "https://github.com/rust-lang/rust/pull/158194",
    merged: "2026-06-28",
  },
  {
    number: 159571,
    title: "Remove an unused bundled-library lookup for the local crate",
    href: "https://github.com/rust-lang/rust/pull/159571",
    merged: "2026-07-20",
  },
];

export const rustLanguageAndToolingContributions: Contribution[] = [
  {
    number: 161692,
    title: "Allow Unpin implementations for local extern types",
    href: "https://github.com/rust-lang/rust/pull/161692",
    merged: "2026-08-29",
  },
  {
    number: 154070,
    title: "Add an options parser for the Unstable Book",
    href: "https://github.com/rust-lang/rust/pull/154070",
    merged: "2026-03-28",
  },
  {
    number: 153980,
    title: "Move the doc(rust_logo) check into the parser",
    href: "https://github.com/rust-lang/rust/pull/153980",
    merged: "2026-03-31",
  },
  {
    number: 153582,
    title: "Simplify find_attr! for HirId usage",
    href: "https://github.com/rust-lang/rust/pull/153582",
    merged: "2026-03-23",
  },
  {
    number: 153073,
    title: "Improve the mem::conjure_zst panic message with the concrete type name",
    href: "https://github.com/rust-lang/rust/pull/153073",
    merged: "2026-02-28",
  },
  {
    number: 95454,
    title: "Only display self-profile passes that take more than five milliseconds",
    href: "https://github.com/rust-lang/rust/pull/95454",
    merged: "2022-05-06",
  },
];

export const denoContributions: Contribution[] = [
  {
    number: 14217,
    title: "Add a fast path for non-streaming TextDecoder calls",
    href: "https://github.com/denoland/deno/pull/14217",
    merged: "2022-05-17",
  },
  {
    number: 14415,
    title: "Add userAgent to Navigator's prototype",
    href: "https://github.com/denoland/deno/pull/14415",
    merged: "2022-05-14",
  },
];

export const rustAnalyzerContributions: Contribution[] = [
  {
    number: 17392,
    title: "Align the internal Length name with Len",
    href: "https://github.com/rust-lang/rust-analyzer/pull/17392",
    merged: "2024-06-11",
  },
  {
    number: 13207,
    title: "Add semicolon completion for module declarations",
    href: "https://github.com/rust-lang/rust-analyzer/pull/13207",
    merged: "2022-09-09",
  },
  {
    number: 12118,
    title: "Rename crates consistently to kebab-case",
    href: "https://github.com/rust-lang/rust-analyzer/pull/12118",
    merged: "2022-05-01",
  },
];
