import { rustFailureAtlasEntries } from "./rust-failure-atlas.mjs";

export const rustSystemsAtlasGoal = {
  canonicalPages: 750,
  evidenceArtifacts: 250,
  failurePagesAtMilestone: 300,
  description:
    "The first authority milestone across the complete Rust atlas, not a claim about material already published. Pages count once even when several indexes point to them; the Failure Atlas can continue toward its larger long-term corpus after this milestone.",
};

export const rustSystemsAtlasEditorialSections = {
  "BufReader-rust": "types-memory-unsafe",
  "where-a-type-becomes-a-layout-fields-padding-and-reordering": "types-memory-unsafe",
  "two-ways-to-make-a-type-disappear-erasure-and-monomorphization": "compiler-internals",
  "the-processor-has-no-types-what-add-does-to-bits-it-does-not-understand": "types-memory-unsafe",
  "runtime-type-tags-what-dynamic-languages-keep-that-static-ones-throw-away":
    "types-memory-unsafe",
  "types-as-proofs-what-the-checker-knows-that-the-binary-forgets": "types-memory-unsafe",
  "behavior-without-shape-traits-interfaces-and-types-that-own-no-bytes": "types-memory-unsafe",
  "a-type-is-a-set-why-human-has-two-members-and-option-human-has-three": "types-memory-unsafe",
  "shape-without-behavior-two-structs-with-the-same-fields": "types-memory-unsafe",
  "does-a-type-exist-at-runtime-following-one-value-from-source-to-register": "compiler-internals",
  "what-is-a-type-a-set-of-values-a-promise-about-operations-or-both": "types-memory-unsafe",
  "how-async-rust-works-under-the-hood": "async-concurrency",
  "async-fn-in-dyn-trait-what-the-box-costs-measured": "async-concurrency",
  "async-cleanup-in-rust-when-drop-cannot-await": "async-concurrency",
  "why-is-my-rust-build-slow-a-diagnostic-tree": "cargo-build-linking",
  "why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons": "cargo-build-linking",
  "the-unit-of-rebuild-when-you-split-a-rust-workspace": "cargo-build-linking",
  "building-a-sandboxed-code-playground-in-rust": "compiler-internals",
  "zero-copy-does-not-mean-zero-memory-access-aho-corasick-rust": "types-memory-unsafe",
  "search-across-chunk-boundaries-rust-without-missing-matches": "types-memory-unsafe",
  "why-aho-corasick-streaming-still-needs-buffer": "types-memory-unsafe",
  "aho-corasick-match-kinds-standard-leftmost-rust": "types-memory-unsafe",
  "aho-corasick-dfa-or-nfa-rust": "types-memory-unsafe",
  "why-more-patterns-can-slow-aho-corasick": "types-memory-unsafe",
  "when-aho-corasick-prefilters-help-or-hurt": "types-memory-unsafe",
  "pattern-shape-simd-search-performance-rust": "types-memory-unsafe",
  "why-one-lookup-per-byte-can-be-latency-bound": "types-memory-unsafe",
  "benchmark-streaming-scanner-rust": "types-memory-unsafe",
  "when-match-reporting-costs-more-than-search": "types-memory-unsafe",
  "rust-bytes-are-not-text-utf8-scanners": "types-memory-unsafe",
  "rust-bufread-slices-memory-mapping-copying": "types-memory-unsafe",
  "reuse-compiled-aho-corasick-searchers-rust": "types-memory-unsafe",
  "test-streaming-algorithms-every-chunk-boundary": "types-memory-unsafe",
};

export const rustSystemsAtlasSections = [
  {
    slug: "diagnostic-failures",
    title: "Failure Atlas",
    shortTitle: "Failures",
    targetPages: 300,
    description:
      "Symptom-first investigations for failures that depend on timing, target, profile, version, feature graph, linker, or unsafe invariants.",
    questions: [
      "What exact evidence separates the likely causes?",
      "Can the failure be forced instead of waiting for it?",
      "Which regression check proves the repair?",
    ],
    href: "/rust-failure-atlas",
  },
  {
    slug: "compiler-internals",
    title: "Compiler and Tooling Atlas",
    shortTitle: "Compiler",
    targetPages: 125,
    description:
      "Source-to-binary maps through parsing, expansion, resolution, HIR, THIR, MIR, trait solving, borrow checking, code generation, diagnostics, and rust-analyzer.",
    questions: [
      "Which compiler representation owns this fact?",
      "Which query computes it and what invalidates that result?",
      "How does the compiler map the result back to source?",
    ],
    href: "/blog/topics/rust-under-the-hood",
    failureArea: "diagnostics-macros",
  },
  {
    slug: "cargo-build-linking",
    title: "Cargo, Build, and Linking Atlas",
    shortTitle: "Build",
    targetPages: 75,
    description:
      "Feature resolution, MSRV, build scripts, fingerprints, incremental compilation, proc-macro builds, native dependencies, code generation, and linkers.",
    questions: [
      "Which graph and compilation unit made this decision?",
      "Why did an artifact rebuild or stop being reusable?",
      "Which host, target, flag, or native input changed?",
    ],
    href: "/rust#cargo-build-linking",
    failureArea: "cargo-dependencies",
  },
  {
    slug: "async-concurrency",
    title: "Async and Concurrency Atlas",
    shortTitle: "Async",
    targetPages: 75,
    description:
      "Future layout, Send boundaries, cancellation, wakeups, scheduling, cooperative budgets, atomics, backpressure, task ownership, and shutdown.",
    questions: [
      "What state lives across this suspension point?",
      "Which operation can be cancelled or reordered?",
      "Who owns progress, capacity, and completion?",
    ],
    href: "/rust#async-concurrency",
    failureArea: "async-runtime",
  },
  {
    slug: "types-memory-unsafe",
    title: "Types, Memory, and Unsafe Atlas",
    shortTitle: "Memory",
    targetPages: 75,
    description:
      "Layout, variance, drop checking, pinning, provenance, aliasing, initialization, destruction, trait objects, and the proof obligations behind safe APIs.",
    questions: [
      "Which invariant is the compiler enforcing or trusting?",
      "What operations remain available through safe code?",
      "Can Miri, layout inspection, or a drop trace test the model?",
    ],
    href: "/rust#types-memory-unsafe",
    failureArea: "concurrency-memory",
  },
  {
    slug: "ffi-targets",
    title: "FFI and Target Atlas",
    shortTitle: "Targets",
    targetPages: 50,
    description:
      "ABI contracts, native libraries, WebAssembly, musl, operating systems, architectures, embedded targets, cross-compilation, and host capabilities.",
    questions: [
      "Which side owns allocation, errors, and lifetime?",
      "Does the same artifact behave differently on another target?",
      "What does the final linked binary actually import and export?",
    ],
    href: "/rust#ffi-targets",
    failureArea: "ffi-targets",
  },
  {
    slug: "release-compatibility",
    title: "Release and Compatibility Ledger",
    shortTitle: "Releases",
    targetPages: 50,
    description:
      "Important stable changes translated into affected code, compatibility boundaries, migration checks, and behavior compared across toolchain versions.",
    questions: [
      "Which release first changed this behavior?",
      "Is the change source, binary, target, or behavioral compatibility?",
      "What should CI compare before and after migration?",
    ],
    href: "/rust#release-compatibility",
    failureArea: "upgrades-compatibility",
  },
];

export const rustSystemsAtlasAxes = [
  "observed symptom",
  "failure family",
  "likely cause and first discriminating check",
  "Rust versions",
  "targets and profiles",
  "failing and repaired fixture, with the toolchain it ran on",
  "review date",
  "primary sources",
];

const failureArticleSlugs = new Set(rustFailureAtlasEntries.map((entry) => entry.articleSlug));

function rustOpportunityNumber(opportunity) {
  const match = /^RUST-(\d{3})$/.exec(opportunity.id);
  return match ? Number(match[1]) : Number.NaN;
}

export function rustAtlasSectionForOpportunity(opportunity) {
  if (failureArticleSlugs.has(opportunity.slug)) return "diagnostic-failures";

  const number = rustOpportunityNumber(opportunity);
  if (number >= 13 && number <= 18) return "cargo-build-linking";
  if (number >= 26 && number <= 45) return "async-concurrency";
  if ((number >= 25 && number <= 25) || (number >= 46 && number <= 60)) {
    return "types-memory-unsafe";
  }
  if (number >= 61 && number <= 70) return "release-compatibility";
  return "compiler-internals";
}

export function rustAtlasSectionForEditorialArticle(slug) {
  return rustSystemsAtlasEditorialSections[slug];
}

export function getRustSystemsAtlasSection(slug) {
  return rustSystemsAtlasSections.find((section) => section.slug === slug);
}
