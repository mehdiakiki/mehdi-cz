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
  {
    slug: "from-source-to-process",
    title: "From source to a running process",
    summary:
      "Twenty parts that follow small C and Rust programs from the linker to the exit of the process: ELF files, relocations, static and dynamic linking, the loader, the PLT and the GOT, LD_PRELOAD, the code before main, the first stack, the memory map, page faults, fork, malloc, system calls, stack overflows and thread-local storage. One script reproduces every output.",
    themes: ["layers"],
    parts: [
      "what-happens-when-you-run-a-program-from-execve-to-main",
      "what-is-inside-an-executable-file-elf-headers-segments-and-sections",
      "where-variables-live-in-a-binary-text-rodata-data-and-bss",
      "why-undefined-reference-is-a-linker-error-not-a-compiler-error",
      "relocations-the-holes-the-compiler-leaves-for-the-linker",
      "static-or-dynamic-linking-what-changes-in-the-binary-and-at-startup",
      "how-the-dynamic-loader-finds-a-shared-library",
      "how-a-call-to-printf-finds-printf-the-plt-and-the-got",
      "how-ld-preload-replaces-a-function-without-recompiling",
      "the-code-that-runs-before-main-start-constructors-and-init-array",
      "what-is-on-the-stack-when-a-process-starts-argv-envp-and-auxv",
      "reading-proc-self-maps-line-by-line",
      "why-the-first-touch-of-memory-is-slow-demand-paging-measured",
      "what-fork-really-copies-copy-on-write-measured",
      "when-malloc-asks-the-kernel-for-memory-brk-and-mmap",
      "why-freeing-memory-does-not-shrink-your-process",
      "what-a-system-call-costs-and-why-some-calls-skip-the-kernel",
      "how-a-stack-overflow-is-detected-guard-pages-and-signals",
      "how-each-thread-gets-its-own-copy-of-a-variable-thread-local-storage",
      "what-happens-when-a-process-exits",
    ],
    evidence: "experiments/from-source-to-process/",
  },
  {
    slug: "what-survives-a-crash",
    title: "What survives a crash",
    summary:
      "Twenty parts on what really reaches the disk: write and the page cache, the cost of fsync, saving a file with rename, the directory fsync, torn writes, a crash simulator built from strace output, a small write-ahead log with checkpoints and recovery, SQLite journal and WAL modes, group commit, mmap, checksums and crash testing. Small programs in Rust, Python and C, with one script that reproduces every output.",
    themes: ["interrupted-execution"],
    parts: [
      "your-data-is-not-on-disk-when-write-returns",
      "what-fsync-costs-on-a-laptop-ssd",
      "how-to-save-a-file-without-losing-it-write-fsync-rename",
      "why-the-directory-needs-fsync-too",
      "the-zero-length-file-problem-and-what-ext4-does-about-it",
      "what-a-crash-in-the-middle-of-a-write-leaves-behind",
      "building-a-tiny-crash-simulator-from-strace-output",
      "an-append-only-log-that-survives-a-torn-last-record",
      "write-ahead-logging-from-scratch",
      "checkpointing-a-log-without-losing-the-tail",
      "recovery-code-must-survive-a-crash-too",
      "when-fsync-fails-what-postgresql-learned-in-2018",
      "how-sqlite-commits-a-transaction-followed-with-strace",
      "sqlite-wal-mode-fewer-fsyncs-a-different-promise",
      "durability-settings-that-trade-your-data-for-speed",
      "group-commit-how-databases-make-fsync-cheaper",
      "writing-through-mmap-who-decides-when-data-reaches-the-disk",
      "checksums-catching-corruption-the-disk-did-not-report",
      "updating-several-files-at-once-with-one-rename",
      "testing-crash-recovery-kill-9-fault-injection-and-simulation",
    ],
    evidence: "experiments/what-survives-a-crash/",
  },
  {
    slug: "when-the-benchmark-lies",
    title: "When the benchmark lies",
    summary:
      "Twenty ways a performance number goes wrong, each reproduced on one laptop: a loop the compiler deleted, debug builds, warm-up and the JIT, CPU frequency and efficiency cores, averages and coordinated omission, clocks, run counts, blocks against interleaved runs, environment size, code alignment, caches, branch prediction, the allocator, and a microbenchmark that lost inside the real program. One script reproduces every output.",
    themes: ["measurement"],
    parts: [
      "the-benchmark-that-measured-nothing",
      "a-debug-build-measures-a-different-program",
      "when-the-compiler-computes-the-answer-before-the-benchmark-runs",
      "why-the-first-run-is-slower",
      "jit-warmup-why-a-function-gets-faster-after-thousands-of-calls",
      "my-laptop-changed-its-cpu-speed-during-the-benchmark",
      "the-benchmark-ran-on-an-efficiency-core",
      "the-average-hides-the-slow-requests",
      "coordinated-omission-how-a-load-test-hides-its-worst-latency",
      "which-clock-to-use-when-you-measure-time",
      "measuring-something-faster-than-the-clock",
      "how-many-benchmark-runs-are-enough",
      "compare-two-versions-by-interleaving-the-runs",
      "can-environment-variables-change-how-fast-your-code-runs",
      "does-code-alignment-change-the-speed-of-the-same-code",
      "when-the-working-set-no-longer-fits-in-cache",
      "why-sorted-data-can-make-the-same-loop-faster",
      "the-benchmark-measured-the-allocator",
      "the-microbenchmark-won-and-the-program-got-slower",
      "a-benchmark-result-someone-else-can-check",
    ],
    evidence: "experiments/when-the-benchmark-lies/",
  },
  {
    slug: "following-a-tcp-connection",
    title: "Following a TCP connection",
    summary:
      "Ten parts that follow one TCP connection on loopback, from connect() to a connection pool: the handshake, the accept queue, Nagle and delayed ACK, the byte stream, full socket buffers, what close() sends, TIME_WAIT, getaddrinfo and the cost of TLS. Only what ss, the kernel counters, timings and system calls show, with one script that reproduces every output.",
    themes: ["layers"],
    parts: [
      "what-happens-when-your-program-calls-connect",
      "the-accept-queue-what-happens-when-a-server-accepts-too-slowly",
      "why-a-small-write-can-wait-40-milliseconds-nagle-and-delayed-ack",
      "why-recv-returns-less-than-you-asked-tcp-is-a-byte-stream",
      "what-a-full-socket-buffer-does-to-the-sender",
      "what-close-really-sends-fin-rst-and-unread-data",
      "time-wait-why-a-closed-connection-stays-around",
      "how-a-name-becomes-an-address-what-getaddrinfo-really-does",
      "what-a-tls-handshake-costs",
      "what-a-connection-pool-saves-and-the-stale-connection-it-gives-back",
    ],
    evidence: "experiments/following-a-tcp-connection/",
  },
  {
    slug: "inside-a-database-index",
    title: "Inside a database index",
    summary:
      "Ten parts on what an index really is, measured on a SQLite table of one million rows: a second sorted copy of the data, SCAN against SEARCH, the cost on every insert, column order, covering indexes, the cases where the planner ignores an index, statistics that go stale, partial and expression indexes, free pages and VACUUM, and a search index kept in sync.",
    themes: ["derived-state"],
    parts: [
      "an-index-is-a-second-copy-of-your-data",
      "reading-explain-query-plan-scan-versus-search",
      "what-an-index-costs-on-every-insert",
      "why-column-order-matters-in-a-composite-index",
      "a-covering-index-never-touches-the-table",
      "when-the-database-ignores-your-index",
      "planner-statistics-go-stale-too-analyze-and-a-plan-that-changes",
      "partial-and-expression-indexes-index-only-what-you-query",
      "deleted-rows-do-not-shrink-the-file-free-pages-and-vacuum",
      "keeping-a-derived-index-in-sync-outside-the-database",
    ],
    evidence: "experiments/inside-a-database-index/",
  },
];

/**
 * Standalone articles by theme, strongest first.
 */
const articleSlugsByTheme = {
  layers: [
    "rust-request-waiting-for-pool-or-postgresql",
    "slow-postgresql-row-consumer-holds-rust-connection",
    "rust-oracle-client-library-missing-in-deployment",
    "axum-json-rejection-handler-never-ran",
    "axum-middleware-order-timeout-boundary",
    "sql-postgresql-rust-service-transactions",
    "mysql-rust-stock-reservation-transaction",
    "sql-sqlite-rust-local-database",
    "mariadb-mysql-rust-compatibility-contract",
    "adding-rust-to-a-system-that-already-uses-sql-server",
    "adding-rust-to-a-system-that-already-uses-oracle",
    "a-rust-tool-for-an-existing-db2-database",
    "duckdb-rust-csv-report-explicit-schema",
    "sql-postgresql-rust-hot-update-index-work",
    "sql-postgresql-rust-row-security-tenant-context",
    "mysql-primary-key-secondary-index-rust",
    "mysql-range-lock-blocks-insert-rust",
    "mysql-rust-collation-unique-names",
    "sql-sqlite-rust-tokio-bounded-database-worker",
    "sql-sqlite-rust-foreign-keys-every-connection",
    "a-sql-server-read-waited-behind-an-update",
    "an-empty-oracle-string-became-none-in-rust",
    "an-oracle-number-did-not-fit-in-a-rust-i64",
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
    "when-more-threads-make-a-service-slower",
    "the-sandbox-stayed-closed-the-file-helper-did-not",
    "blocking-http-did-not-block-the-way-out",
    "the-safe-path-changed-before-it-was-opened",
    "localhost-is-not-an-admin-password",
    "the-readme-asked-for-a-different-job",
  ],
  "derived-state": [
    "sqlx-offline-build-stale-database-metadata",
    "postgresql-column-migration-two-rust-versions",
    "revoke-session-across-rust-replicas",
    "sql-postgresql-rust-row-snapshots",
    "sql-postgresql-rust-enum-migration-old-decoder",
    "mysql-mariadb-json-round-trip-rust",
    "mariadb-system-versioned-history-rust",
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
    "the-cache-made-the-build-fast-and-wrong",
    "the-monorepo-ran-every-test-for-a-small-change",
    "the-api-changed-the-old-mobile-app-did-not",
    "the-next-agent-read-the-previous-jobs-files",
  ],
  "interrupted-execution": [
    "postgresql-commit-reply-lost-rust",
    "rust-sigterm-drain-inflight-requests",
    "interrupted-upload-needs-durable-cleanup",
    "postgresql-job-lease-stale-rust-worker",
    "sql-postgresql-rust-retry-whole-transaction",
    "sql-postgresql-rust-listen-notify-durable-work",
    "mysql-rust-deadlock-order-bounded-retry",
    "sql-sqlite-rust-wal-busy-writers",
    "loading-a-batch-into-sql-server-from-rust",
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
    "every-new-commit-cancelled-the-check-that-mattered",
    "the-scheduler-worked-and-the-article-never-appeared",
    "the-timeout-ended-one-process-not-the-job",
  ],
  measurement: [
    "tokio-spawn-loses-request-tracing-span",
    "sql-server-used-a-different-plan-for-the-same-query",
    "duckdb-parquet-projection-filter-plan-rust",
    "duckdb-memory-limit-scratch-rust",
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
    "the-agent-finished-the-pipeline-did-not",
    "the-build-was-green-and-nobody-understood-the-change",
    "the-agent-made-the-flaky-test-green",
    "the-test-passed-on-the-wrong-commit",
    "the-review-queue-outgrew-the-build-queue",
    "the-agent-learned-to-ignore-the-check",
    "why-postgresql-stopped-using-the-index",
    "following-one-slow-request-through-an-app",
    "does-this-search-need-a-vector-database",
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
    "deno-joining-cloudflare-what-happens-to-your-app",
    "what-can-an-ai-agent-reach-from-its-sandbox",
    "could-this-feature-run-entirely-in-the-browser",
    "what-really-runs-when-you-install-an-npm-package",
    "why-does-a-simple-page-need-so-much-javascript",
    "the-child-process-inherited-the-secret",
    "a-filename-became-a-shell-command",
    "sometimes-the-escape-is-in-the-runtime",
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
