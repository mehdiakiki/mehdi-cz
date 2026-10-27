# Rust and database follow-ups, October 27, 2026

Five manuscripts are listed in `docs/editorial/sql-rust-followups-2026-10-27.json`.
They remain private drafts. Their frontmatter dates record creation, not publication.
Article authorship belongs to Mehdi Akiki alone.

Run all workloads through the existing Content safety GitHub workflow. Its runner
selection is unchanged. Local compilation, tests, previews and nested Cargo commands
are outside the repository's execution policy.

## PostgreSQL fixtures

The existing PostgreSQL/SQLite job uses the pinned PostgreSQL 18.6 service image,
SQLx 0.8.6, and Tokio 1.48.0. Each fixture creates a unique schema. Successful runs
drop it; the disposable CI service also bounds cleanup after a timeout or panic.
The job already limits Cargo build concurrency to two.

- `pg_waits`: a task waits before acquisition, a checked-out idle connection
  blocks acquisition, and a separate session blocks on a known row-lock holder.
  Channels and observed backend state establish the ordering. Acquisition timeouts
  are assertions about capacity, not latency measurements.
- `pg_commit_reply`: rejects an invalid amount, terminates a session with an open
  transaction, and then suppresses a genuine COMMIT CommandComplete frame in a
  bounded plaintext loopback relay. Separate reads check balance and receipts.
  Replaying an operation key must not reapply its effect; changed input must fail.
  This does not cover failover, power loss, concurrent retry races, or external effects.
- `pg_slow_rows`: pauses after the first decoded row, checks pool exhaustion,
  resumes or aborts the task, and verifies that a later borrower can run a new query.
  The collection case retains rows while releasing connection capacity. No HTTP
  integration, process memory measurement, or server socket wait is claimed.

All three are integration tests and runnable binaries. CI captures their output.
Statement, transaction and outer fixture timeouts bound the runs.

## SQLx metadata trial

`pg_metadata_trial` is a CI-only driver. It creates a fresh PostgreSQL schema and
launches Cargo for the separate `offline-metadata` crate. Each stage rewrites the
same source bytes to make Cargo re-expand the macro. Baseline live expansion writes
metadata, and the baseline offline program must run successfully.

After an integer-to-bigint migration, a stale offline check must still compile.
Running it must fail with ColumnDecode/INT8. A live check must fail specifically
with an i32/i64 mismatch and write different metadata. Neither an arbitrary command
failure nor a previously compiled executable satisfies the check.

The driver captures expected diagnostics. It uses live macro expansion rather than
installing sqlx-cli, so it does not claim to run `prepare --check`. CI preserves the
resolved lockfile and metadata. Generated metadata describes the disposable schema;
it is trial evidence rather than this site's production query cache.

## Oracle client probe

The enterprise job compiles `oracle_client_probe` with oracle 0.6.3 and runs
`--expect-missing`. This path must report DPI-1047 without attempting a connection.
Unexpected client availability or another error fails the check.

The ordinary probe path initializes the client once in a fresh process. It requires
the actual supported Oracle Client and operating system dependencies. It has no
credentials and does not establish server compatibility. Successful loading and
database integration remain unverified in CI; record client, server, image and
architecture identities before making deployment claims.

## Editorial checks

The verification job checks publication holds, sole-author metadata and Rust excerpts
against marked source. The production build compiles MDX. Private HTML review copies
are uploaded in `editorial-rendered-previews/previews/sql-rust-followups`.
The preview script also checks that no draft has a production route, search result,
RSS item or sitemap entry, and that links to existing articles are publicly usable.

Formatting, Rust formatting and missing lockfiles are preserved as CI patches.
Apply those patches and require a clean patch on the final checked revision.
