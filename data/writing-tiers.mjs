/**
 * Writing tiers and themes.
 *
 * Every post belongs to exactly one tier:
 *
 * - investigation: a part of a multi-part, evidence-backed investigation. Only
 *   posts listed in `investigations[].parts` get this tier.
 * - article: substantial standalone technical writing that answers one of the
 *   four theme questions. Only posts listed in `articleSlugsByTheme` get this
 *   tier, and every article has a theme.
 * - reference: everything else. Notes, TILs, beginner material, release-note
 *   explainers, generic tool and AI explainers, frontend guides, interview
 *   preparation, and the weaker twin of near-duplicate posts.
 *
 * Reference is the default. A new post that nobody has classified stays in the
 * archive and in search, but it never lands in the investigation or article
 * paths until a slug is added here on purpose.
 *
 * List order is editorial order.
 */

export const defaultWritingTier = "reference";

export const writingTierLabels = {
  investigation: "Investigation",
  article: "Article",
  reference: "Reference",
};

export const writingThemeSlugs = [
  "layers",
  "derived-state",
  "interrupted-execution",
  "measurement",
];

export const writingThemes = [
  {
    slug: "layers",
    label: "Through the layers",
    title: "Following a system through its layers",
    description:
      "Source, runtime, protocol, compiler, machine. Each piece follows one behaviour down to the layer that decides it.",
  },
  {
    slug: "derived-state",
    label: "Derived state",
    title: "Derived state, build artifacts and invalidation",
    description:
      "What gets stored, what gets recomputed, what becomes stale, and how the system knows.",
  },
  {
    slug: "interrupted-execution",
    label: "Interrupted execution",
    title: "Correctness when execution is interrupted",
    description:
      "Crashes, retries, cancellation, partial progress, ownership, recovery and idempotency.",
  },
  {
    slug: "measurement",
    label: "Measurement",
    title: "Measurement-driven systems work",
    description:
      "Treating an assumption as a hypothesis, building an experiment, following a surprising result into a lower layer, and rejecting a change when the evidence says it loses.",
  },
];

/**
 * Investigations in reading order. `parts` are blog slugs in series order; an
 * investigation without parts lives on its own page at `href`. The first theme
 * is the primary one.
 */
export const investigations = [
  {
    slug: "site-performance-lab",
    title: "This site as an engineering laboratory",
    href: "/work/site-performance-lab",
    summary: "Kept, rejected and upstream results from more than fifty experiments on this site.",
    themes: ["measurement"],
    parts: [],
    evidence: "experiments/",
  },
  {
    slug: "types-under-the-hood",
    title: "Types under the hood",
    summary:
      "Ten parts on what a type is and where it goes: sets of values, layouts and padding, erasure and monomorphization, the bits the processor actually sees, and what the checker knows that the binary forgets. Small programs in Rust, C, TypeScript and Python, with one script that reproduces every output.",
    themes: ["layers"],
    parts: [
      "what-is-a-type-a-set-of-values-a-promise-about-operations-or-both",
      "does-a-type-exist-at-runtime-following-one-value-from-source-to-register",
      "a-type-is-a-set-why-human-has-two-members-and-option-human-has-three",
      "shape-without-behavior-two-structs-with-the-same-fields",
      "behavior-without-shape-traits-interfaces-and-types-that-own-no-bytes",
      "where-a-type-becomes-a-layout-fields-padding-and-reordering",
      "two-ways-to-make-a-type-disappear-erasure-and-monomorphization",
      "the-processor-has-no-types-what-add-does-to-bits-it-does-not-understand",
      "runtime-type-tags-what-dynamic-languages-keep-that-static-ones-throw-away",
      "types-as-proofs-what-the-checker-knows-that-the-binary-forgets",
    ],
    evidence: "experiments/rust-atlas/types-under-the-hood/",
  },
  {
    slug: "rust-build-times",
    title: "Rust build times",
    summary:
      "A measured diagnostic tree for slow Rust builds: cargo --timings for the shape, the fingerprint log for unexpected rebuilds, -Ztime-passes for the phase inside one crate, and what splitting a workspace into more crates actually changes.",
    themes: ["derived-state", "measurement"],
    parts: [
      "why-is-my-rust-build-slow-a-diagnostic-tree",
      "why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons",
      "the-unit-of-rebuild-when-you-split-a-rust-workspace",
    ],
    evidence: "experiments/rust-atlas/build-times/",
  },
  {
    slug: "async-rust",
    title: "Async Rust under the hood",
    summary:
      "Five async Rust problems reproduced in one small tokio program: an oversized future, a future that is not Send, a blocking call, a select! loop that loses data, and a shutdown that hangs. Then the cost of async fn through dyn Trait, and cleanup when Drop cannot await.",
    themes: ["interrupted-execution", "layers"],
    parts: [
      "how-async-rust-works-under-the-hood",
      "async-fn-in-dyn-trait-what-the-box-costs-measured",
      "async-cleanup-in-rust-when-drop-cannot-await",
    ],
    evidence: "experiments/rust-atlas/async-symptoms/",
  },
  {
    slug: "rust-failure-atlas",
    title: "Rust Failure Atlas",
    href: "/rust-failure-atlas",
    summary:
      "Rust failures that are difficult to name and easy to misdiagnose, organized from symptom to mechanism, with a failing and a repaired fixture for most cases.",
    themes: ["layers"],
    parts: [],
  },
];

/**
 * Standalone articles by theme, strongest first.
 */
const articleSlugsByTheme = {
  layers: [
    "hir-thir-and-mir-the-same-rust-function-at-three-compiler-stages",
    "websockets-from-the-wire-up",
    "deno_files",
    "zero-copy-does-not-mean-zero-memory-access-aho-corasick-rust",
    "rustc-defid-vs-hirid",
    "how-rust-turns-a-trait-bound-into-solver-obligations",
    "grpc-from-the-ground-up",
    "tokio-main-deep-dive",
    "rust-future-send-across-await",
    "rust-async-future-size",
    "building-a-sandboxed-code-playground-in-rust",
    "rust-enum-niche-optimization",
    "rust-strict-provenance-pointer-address",
    "rust-ffi-guide",
    "rust-phantomdata-variance-drop-check",
    "rust-pin-projection-structural-pinning",
    "rust-asyncfn-lending-callbacks",
    "rust-2024-temporary-lifetime-drop-scopes",
    "why-procedural-macro-errors-point-at-the-wrong-code",
    "rust-macro-hygiene-spans",
    "semantics-rust-analyzer",
    "rust-s-v0-symbol-mangling-what-changed-in-rust-1-97",
    "rust-1-97-linker-messages-which-warnings-belong-to-rustc",
    "rust-string-literal-under-the-hood",
    "acquire-release-rust",
    "gRPC-encoding",
    "build-a-mini-kafka-broker",
    "design-control-plane-distributed-database",
    "pattern-shape-simd-search-performance-rust",
    "why-more-patterns-can-slow-aho-corasick",
    "when-aho-corasick-prefilters-help-or-hurt",
    "why-aho-corasick-streaming-still-needs-buffer",
    "search-across-chunk-boundaries-rust-without-missing-matches",
    "aho-corasick-dfa-or-nfa-rust",
    "aho-corasick-match-kinds-standard-leftmost-rust",
    "carry-user-authorization-through-every-ai-tool-call",
    "validate-model-generated-tool-arguments-at-the-boundary",
  ],
  "derived-state": [
    "what-invalidates-rusts-incremental-compilation-cache",
    "rustc-query-system-why-the-compiler-computes-facts-on-demand",
    "reconciliation-cross-system-sync",
    "why-cargo-build-scripts-rerun-and-how-to-make-them-predictable",
    "why-updated-at-is-a-dangerous-synchronization-cursor",
    "how-to-combine-full-snapshots-and-incremental-deltas-safely",
    "cargo-feature-unification-across-workspaces-host-tools-and-targets",
    "denying-rust-warnings-without-throwing-away-the-cargo-cache",
    "where-rust-monomorphization-happens-and-why-codegen-units-matter",
    "high-water-marks-overlap-windows-and-the-records-between-them",
    "what-happens-when-api-data-changes-while-you-paginate",
    "running-a-backfill-without-racing-the-live-data-stream",
    "late-arriving-records-without-rewinding-the-whole-pipeline",
    "cargo-resolver-3-how-msrv-changes-dependency-selection",
    "identity-mapping-tables-the-small-data-structure-every-integration-needs",
    "conflict-resolution-for-bidirectional-sync-beyond-last-write-wins",
    "define-field-ownership-before-you-build-bidirectional-sync",
    "when-a-canonical-model-loses-provider-specific-meaning",
    "contract-tests-that-detect-provider-drift-before-production",
    "provider-adapters-should-translate-behaviour-not-only-json",
    "stable-internal-model-api-integrations",
    "external-schema-changes-product-model",
  ],
  "interrupted-execution": [
    "when-to-advance-a-sync-checkpoint-after-partial-success",
    "resuming-a-paginated-import-after-page-417-fails",
    "rust-async-cancellation-safety",
    "preventing-an-oauth-token-refresh-stampede",
    "make-retried-agent-actions-idempotent-before-adding-autonomy",
    "a-durable-cursor-for-incremental-api-synchronization",
    "how-long-must-a-consumer-remember-duplicate-messages",
    "the-inbox-pattern-deduplicate-before-business-logic-runs",
    "choosing-a-batch-size-when-an-api-can-fail-half-the-batch",
    "retries-that-respect-retry-after-deadlines-and-a-retry-budget",
    "reliable-file-imports-over-sftp-without-exactly-once-delivery",
    "webhooks-polling-or-both-a-recovery-first-integration-design",
    "webhook-signatures-need-replay-protection-too",
    "data-synchronization-partial-failure",
    "testing-an-api-integration-against-time-retries-and-bad-pages",
    "adaptive-concurrency-for-apis-with-changing-rate-limits",
    "sharing-one-provider-quota-across-many-customers",
  ],
  measurement: [
    "what-evidence-an-ai-feature-needs-before-you-ship-it",
    "eval-scores-move-between-runs-how-to-compare-two-versions-honestly",
    "a-record-and-replay-harness-for-agent-tests",
    "the-final-answer-can-be-right-while-the-tool-trajectory-is-unsafe",
    "calibrating-an-llm-judge-against-human-disagreement",
    "evaluate-retrieval-separately-from-answer-generation",
    "regression-testing-across-prompt-and-model-changes",
    "golden-tests-for-non-deterministic-ai-outputs",
    "offline-evals-predict-online-signals-correct",
    "a-failure-taxonomy-for-ai-features-that-teams-can-actually-measure",
    "sampling-ai-outputs-for-human-review-without-only-seeing-easy-cases",
    "red-team-the-workflow-not-only-the-prompt",
    "turn-production-traces-into-an-evaluation-set-without-copying-user-data",
  ],
};

/**
 * Reference posts that still belong to a theme. They stay reference tier and
 * appear in a theme's shorter-pieces list. Unlisted reference posts have no
 * theme and live only in the archive and search.
 */
const referenceSlugsByTheme = {
  layers: [
    "grpc-streaming-vs-unary",
    "why-kafka-is-fast",
    "stacktraces-rust",
    "sized-vs-unsized-in-rust",
    "oneshot-channel-rust",
    "macro_rules-rust",
    "generic-unsized-to-trait-object",
    "multi-trait-object-rust",
    "orphan-rule-rust",
    "cell-refcell-rust",
    "trait-object-ramblings",
    "runtime-async",
    "await-rust-iterator",
    "async-rust-libraries",
    "BufReader-rust",
    "rust-ast-display",
    "character-block-device-linux",
    "pluggable-authentication-modules",
  ],
  "derived-state": [
    "centralized-idl-api-versioning",
    "ontology-product-contract",
    "why-ai-systems-still-depend-on-ordinary-data-engineering",
    "http-cache-validation",
    "cursor-vs-offset-pagination",
    "tombstones-deleting-across-systems",
    "last-write-wins",
    "error-building-rust-analyzer",
  ],
  "interrupted-execution": [
    "fair-scheduling-for-multi-tenant-integration-workers",
    "agent-tool-call-deadline",
    "idempotency-key",
    "outbox-pattern",
    "exactly-once-delivery-myth",
    "optimistic-locking-version-number",
  ],
  measurement: [],
};

const themeBySlug = new Map();
const tierBySlug = new Map();
const rankBySlug = new Map();
const investigationPartBySlug = new Map();

function classify(slug, tier, theme, rank) {
  if (tierBySlug.has(slug)) {
    throw new Error(`writing-tiers: ${slug} is classified twice`);
  }
  tierBySlug.set(slug, tier);
  if (theme) themeBySlug.set(slug, theme);
  rankBySlug.set(slug, rank);
}

for (const investigation of investigations) {
  investigation.parts.forEach((slug, index) => {
    classify(slug, "investigation", investigation.themes[0], index);
    investigationPartBySlug.set(slug, { investigation, index });
  });
}
for (const [theme, slugs] of Object.entries(articleSlugsByTheme)) {
  slugs.forEach((slug, index) => classify(slug, "article", theme, index));
}
for (const [theme, slugs] of Object.entries(referenceSlugsByTheme)) {
  slugs.forEach((slug, index) => classify(slug, "reference", theme, index));
}

function slugOf(postOrSlug) {
  return typeof postOrSlug === "string" ? postOrSlug : postOrSlug?.slug;
}

export function getWritingTheme(slug) {
  return writingThemes.find((theme) => theme.slug === slug);
}

/**
 * A note is always reference. Anything not listed above falls back to
 * `defaultWritingTier`.
 */
export function writingTier(postOrSlug) {
  if (typeof postOrSlug === "object" && postOrSlug?.format === "note") return "reference";
  return tierBySlug.get(slugOf(postOrSlug)) ?? defaultWritingTier;
}

export function writingThemeOf(postOrSlug) {
  return themeBySlug.get(slugOf(postOrSlug));
}

/** Position inside its tier and theme list. */
export function writingRank(postOrSlug) {
  return rankBySlug.get(slugOf(postOrSlug)) ?? Number.MAX_SAFE_INTEGER;
}

export function investigationPartOf(postOrSlug) {
  return investigationPartBySlug.get(slugOf(postOrSlug));
}

/** Where an investigation starts: its own page, or its first part. */
export function investigationHref(investigation) {
  return investigation.href ?? `/blog/${investigation.parts[0]}`;
}

export function investigationsForTheme(themeSlug) {
  return investigations.filter((investigation) => investigation.themes.includes(themeSlug));
}

export function articleSlugsForTheme(themeSlug) {
  return [...(articleSlugsByTheme[themeSlug] ?? [])];
}

export function referenceSlugsForTheme(themeSlug) {
  return [...(referenceSlugsByTheme[themeSlug] ?? [])];
}

/** Every explicitly classified slug. */
export function classifiedWritingSlugs() {
  return [...tierBySlug.keys()];
}
