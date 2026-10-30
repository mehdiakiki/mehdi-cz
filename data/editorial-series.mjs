export const editorialSeries = [
  {
    slug: "ci-and-coding-agents",
    title: "CI and coding agents",
    description:
      "Find the delay, preserve the test, and connect each CI result to the code it checked.",
    introduction:
      "A fast patch still needs an answer from CI and a decision from a reviewer. These articles follow the queues, tests, caches, and release steps between writing code and running it safely.",
    parts: [
      "the-agent-finished-the-pipeline-did-not",
      "the-build-was-green-and-nobody-understood-the-change",
      "the-agent-made-the-flaky-test-green",
      "every-new-commit-cancelled-the-check-that-mattered",
      "the-test-passed-on-the-wrong-commit",
      "the-cache-made-the-build-fast-and-wrong",
      "the-monorepo-ran-every-test-for-a-small-change",
      "the-review-queue-outgrew-the-build-queue",
      "the-agent-learned-to-ignore-the-check",
      "the-scheduler-worked-and-the-article-never-appeared",
    ],
  },
  {
    slug: "practical-engineering",
    title: "Practical engineering problems",
    description:
      "Small investigations into slow requests, runtime changes, browser work, and data contracts.",
    introduction:
      "Start with the symptom and choose one thing to inspect. Each article takes a specific engineering problem through a small example, the tradeoffs of a repair, and the checks that tell you whether it helped.",
    parts: [
      "deno-joining-cloudflare-what-happens-to-your-app",
      "what-can-an-ai-agent-reach-from-its-sandbox",
      "why-postgresql-stopped-using-the-index",
      "when-more-threads-make-a-service-slower",
      "could-this-feature-run-entirely-in-the-browser",
      "what-really-runs-when-you-install-an-npm-package",
      "following-one-slow-request-through-an-app",
      "why-does-a-simple-page-need-so-much-javascript",
      "the-api-changed-the-old-mobile-app-did-not",
      "does-this-search-need-a-vector-database",
    ],
  },
  {
    slug: "agent-security-boundaries",
    title: "Agent security boundaries",
    description:
      "Follow the file, process, network, permission, and runtime boundaries around an agent.",
    introduction:
      "An agent can cause damage through an overly powerful host tool even when its VM stays isolated. These articles separate that mistake from a runtime escape and show where to enforce the permission, lifecycle, or containment rule.",
    parts: [
      "the-sandbox-stayed-closed-the-file-helper-did-not",
      "blocking-http-did-not-block-the-way-out",
      "the-child-process-inherited-the-secret",
      "a-filename-became-a-shell-command",
      "the-safe-path-changed-before-it-was-opened",
      "localhost-is-not-an-admin-password",
      "the-readme-asked-for-a-different-job",
      "the-timeout-ended-one-process-not-the-job",
      "the-next-agent-read-the-previous-jobs-files",
      "sometimes-the-escape-is-in-the-runtime",
    ],
  },
  {
    slug: "sql-databases-from-rust",
    title: "SQL databases from Rust",
    description:
      "Use PostgreSQL, MySQL, SQLite, MariaDB, SQL Server, Oracle, Db2 and DuckDB from Rust. Work through transactions, locks, types and query plans.",
    introduction:
      "Start with the database your application already uses, then follow a specific failure. These thirty articles show Rust examples for lost updates, busy writers, retries, schema changes, nullable values and reporting queries.",
    parts: [
      "sql-postgresql-rust-service-transactions",
      "mysql-rust-stock-reservation-transaction",
      "sql-sqlite-rust-local-database",
      "mariadb-mysql-rust-compatibility-contract",
      "adding-rust-to-a-system-that-already-uses-sql-server",
      "adding-rust-to-a-system-that-already-uses-oracle",
      "a-rust-tool-for-an-existing-db2-database",
      "duckdb-rust-csv-report-explicit-schema",
      "sql-postgresql-rust-row-snapshots",
      "sql-postgresql-rust-retry-whole-transaction",
      "sql-postgresql-rust-hot-update-index-work",
      "sql-postgresql-rust-row-security-tenant-context",
      "sql-postgresql-rust-listen-notify-durable-work",
      "sql-postgresql-rust-enum-migration-old-decoder",
      "mysql-primary-key-secondary-index-rust",
      "mysql-rust-deadlock-order-bounded-retry",
      "mysql-range-lock-blocks-insert-rust",
      "mysql-rust-collation-unique-names",
      "sql-sqlite-rust-wal-busy-writers",
      "sql-sqlite-rust-tokio-bounded-database-worker",
      "sql-sqlite-rust-foreign-keys-every-connection",
      "mysql-mariadb-json-round-trip-rust",
      "mariadb-system-versioned-history-rust",
      "a-sql-server-read-waited-behind-an-update",
      "sql-server-used-a-different-plan-for-the-same-query",
      "loading-a-batch-into-sql-server-from-rust",
      "an-empty-oracle-string-became-none-in-rust",
      "an-oracle-number-did-not-fit-in-a-rust-i64",
      "duckdb-parquet-projection-filter-plan-rust",
      "duckdb-memory-limit-scratch-rust",
    ],
  },

  {
    slug: "rust-backend-in-practice",
    title: "Rust backend problems in practice",
    description:
      "Follow failed requests, shutdowns, traces, migrations, sessions, uploads and job leases through small Rust examples.",
    introduction:
      "Each article starts with a backend problem and checks a repair against an executable example. Read the problem you have now, then follow the related Rust and database articles when you need more detail.",
    parts: [
      "axum-json-rejection-handler-never-ran",
      "axum-middleware-order-timeout-boundary",
      "rust-sigterm-drain-inflight-requests",
      "tokio-spawn-loses-request-tracing-span",
      "postgresql-column-migration-two-rust-versions",
      "revoke-session-across-rust-replicas",
      "interrupted-upload-needs-durable-cleanup",
      "postgresql-job-lease-stale-rust-worker",
    ],
  },
  {
    slug: "rust-database-failures",
    title: "Rust and database failures",
    description:
      "Follow request waits, uncertain writes, row streams, memory budgets and deployment dependencies through reproducible Rust examples.",
    introduction:
      "Start with the symptom you can observe. Each article explains a different boundary between the Rust application, database driver and database, with source code and checks for the result.",
    parts: [
      "rust-request-waiting-for-pool-or-postgresql",
      "postgresql-commit-reply-lost-rust",
      "slow-postgresql-row-consumer-holds-rust-connection",
      "sqlx-offline-build-stale-database-metadata",
      "rust-oracle-client-library-missing-in-deployment",
      "rust-timeout-does-not-stop-postgresql-query",
      "bounded-rust-channel-database-producer-memory",
    ],
  },
  {
    slug: "rust-database-recovery",
    title: "Rust database recovery",
    description:
      "Follow duplicate requests, external work, commit failures and import recovery through complete Rust reproductions.",
    introduction:
      "Start with the state your caller can observe. Check the stored result and choose a recovery path with a clear database and application boundary.",
    parts: [
      "keep-http-out-of-database-transactions",
      "duplicate-webhooks-select-insert-race",
      "separate-database-account-for-migrations",
      "return-success-after-database-commit",
      "sqlite-import-leave-room-for-normal-saves",
      "rejected-import-rows-need-a-recovery-path",
    ],
  },
{
  "slug": "rust-database-boundaries",
  "title": "Rust database boundaries",
  "description": "Check index write costs, tenant isolation, and database permissions.",
  "introduction": "Check index write costs, tenant isolation, and database permissions. Each guide gives a concrete reproduction, the resulting decision, and the limits of the evidence.",
  "parts": [
    "index-cost-write-heavy-postgresql-table",
    "two-tenants-in-authorization-tests",
    "reporting-database-account-cannot-write"
  ]
},
{
  "slug": "rust-service-runtime",
  "title": "Rust service runtime decisions",
  "description": "Trace shared locks, queue admission, task ownership, retained memory, and cleanup.",
  "introduction": "Trace shared locks, queue admission, task ownership, retained memory, and cleanup. Each guide gives a concrete reproduction, the resulting decision, and the limits of the evidence.",
  "parts": [
    "release-mutex-before-remote-api-call",
    "decide-what-happens-when-queue-is-full",
    "detached-task-does-not-fix-slow-request",
    "limit-bytes-before-collecting-response-body",
    "bound-task-fanout-before-spawning",
    "arc-clones-retain-old-data",
    "metrics-counter-is-not-a-reservation-protocol",
    "return-worker-failures-to-caller",
    "check-drop-on-slow-rust-request-path"
  ]
},
{
  "slug": "rust-builds-and-testing",
  "title": "Rust builds, tests, and measurements",
  "description": "Keep failing inputs, diagnose build inputs, and compare performance with observable controls.",
  "introduction": "Keep failing inputs, diagnose build inputs, and compare performance with observable controls. Each guide gives a concrete reproduction, the resulting decision, and the limits of the evidence.",
  "parts": [
    "save-failing-input-before-fixing-bug",
    "test-must-fail-for-intended-reason",
    "flaky-test-needs-signal-not-longer-sleep",
    "no-timestamp-in-dependency-cache-key",
    "check-lockfile-before-blaming-rust-upgrade",
    "test-generated-code-from-empty-output",
    "keep-debug-symbols-for-shipped-binary",
    "tail-latency-before-more-request-concurrency",
    "change-one-performance-variable-at-a-time",
    "generated-api-client-separate-rust-crate"
  ]
},
{
  "slug": "rust-integration-recovery",
  "title": "Rust API integration recovery",
  "description": "Keep provider outcomes, pagination, caches, durable acceptance, and repairs explicit.",
  "introduction": "Keep provider outcomes, pagination, caches, durable acceptance, and repairs explicit. Each guide gives a concrete reproduction, the resulting decision, and the limits of the evidence.",
  "parts": [
    "keep-provider-status-out-of-ui",
    "provider-rate-limit-is-not-always-customer-error",
    "choose-one-layer-to-own-retries",
    "check-write-outcome-after-timeout",
    "no-full-integration-repair-inside-get-request",
    "opaque-cursors-bound-to-query",
    "tenant-in-cache-key-not-only-record-id",
    "bulk-response-identify-successful-items",
    "webhook-response-after-durable-acceptance",
    "repair-script-preview-before-write"
  ]
},
{
  "slug": "rust-ai-tool-boundaries",
  "title": "Rust AI tool boundaries",
  "description": "Carry identity, permissions, approval, and resource limits to the place effects happen.",
  "introduction": "Carry identity, permissions, approval, and resource limits to the place effects happen. Each guide gives a concrete reproduction, the resulting decision, and the limits of the evidence.",
  "parts": [
    "start-internal-ai-tool-read-only",
    "model-must-not-select-user-credentials",
    "log-tool-decisions-without-customer-documents",
    "offer-tools-for-current-workflow-only",
    "denied-tool-call-must-leave-no-side-effect",
    "fallback-model-must-preserve-permissions",
    "agent-test-must-not-send-real-email",
    "trusted-tool-still-needs-output-limit",
    "keep-eval-case-that-found-regression",
    "overall-eval-score-hides-workflow-regression"
  ]
},
];

export function editorialSeriesForPost(slug) {
  return editorialSeries.find((series) => series.parts.includes(slug));
}
