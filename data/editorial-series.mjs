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
    "slug": "sql-databases-from-rust",
    "title": "SQL databases from Rust",
    "description": "Use PostgreSQL, MySQL, SQLite, MariaDB, SQL Server, Oracle, Db2 and DuckDB from Rust. Work through transactions, locks, types and query plans.",
    "introduction": "Start with the database your application already uses, then follow a specific failure. These thirty articles show Rust examples for lost updates, busy writers, retries, schema changes, nullable values and reporting queries.",
    "parts": [
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
      "duckdb-memory-limit-scratch-rust"
    ]
  },
];

export function editorialSeriesForPost(slug) {
  return editorialSeries.find((series) => series.parts.includes(slug));
}
