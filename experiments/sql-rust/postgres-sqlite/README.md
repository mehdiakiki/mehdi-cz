# PostgreSQL and SQLite examples for the SQL/Rust drafts

This package owns proposals 1, 3, 9–14, and 19–21. The accompanying articles are
unscheduled drafts. SQL appears inside Rust calls; each article's main excerpt
comes from its bin's `article-example:start` / `article-example:end` markers.

Use GitHub CI with the project's configured runners. Do not compile, run,
format, or test this package on the workstation. The parent coordinator reports
that the runtime tests and all eleven binaries passed in run
[40188718115](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40188718115).
That initial run still failed the formatting/lockfile gate; its formatting patch
and generated Cargo.lock have since been applied. A final clean run remains
separate evidence from that initial runtime pass.

## Pins and engine identity

- SQLx `=0.8.6`, with PostgreSQL, Tokio, and rustls features; SQLite support in
  SQLx is not enabled.
- rusqlite `=0.41.0`, bundled SQLite, plus explicit libsqlite3-sys `=0.39.1` so
  the C-library package cannot float to a different release.
- Tokio `=1.48.0` and tempfile `=3.23.0`; Cargo.lock pins transitive packages.
- Rust 1.89 or newer is required by rusqlite. Preserve the configured CI runner
  selection and toolchain evidence.
- PostgreSQL tests target major 18. Set `SQL_RUST_PG_EXPECT_VERSION_NUM` to the
  exact integer for the pinned CI image if checking a particular patch release.
  The helper prints `server_version_num`; retain that value and the image digest
  with the run. A major-version check alone does not identify an immutable image.
- Every SQLite bin prints `sqlite_version()` and `sqlite_source_id()`. Retain
  these with the pinned C-library package and target architecture. A crate pin
  is not a general recommendation to deploy its bundled engine indefinitely.

## Remote commands and credentials

From the repository root, generate or update the lockfile only in GitHub CI with
`cargo generate-lockfile --manifest-path experiments/sql-rust/postgres-sqlite/Cargo.toml`.
Subsequent verification uses `--locked`.

Self-contained SQLite checks:
`cargo test --locked --manifest-path experiments/sql-rust/postgres-sqlite/Cargo.toml --all-targets`.
The PostgreSQL bins are excluded by a required feature rather than represented
as passing, ignored, or fake database tests.

Full database verification:
`cargo test --locked --manifest-path experiments/sql-rust/postgres-sqlite/Cargo.toml --all-targets --features postgres-integration`.

The PostgreSQL feature requires `SQL_RUST_PG_URL` pointing at a disposable
PostgreSQL 18 database with permission to create/drop schemas. RLS also requires
`SQL_RUST_PG_APP_URL` pointing at that SAME database through a separate login
which is neither a superuser nor a BYPASSRLS role. The setup account must be able
to grant that login access to its own example schema/tables. Create the app role
in the trusted CI bootstrap, never from the article request path. Missing URLs
fail the selected integration test; they are not a skip result. Do not print the
URLs or connect these fixtures to production.

Run each bin with
`cargo run --locked --manifest-path experiments/sql-rust/postgres-sqlite/Cargo.toml --features postgres-integration --bin NAME`:

| Proposal | NAME | Expected evidence |
| --- | --- | --- |
| 1 | `pg_service` | One committed credit transfer; duplicate request failure rolls back its writes; negative/oversized operations refused; stored check enforced |
| 3 | `sqlite_local` | Committed note survives connection close/reopen; rolled-back note absent; migration rerun preserves data; invalid flag rejected |
| 9 | `pg_snapshots` | Coordinated second connection changes Read Committed's second read; Repeatable Read retains its first view until commit |
| 10 | `pg_retry` | Actual first-attempt serialization conflict; second attempt rereads current value; two attempts and final value checked |
| 11 | `pg_hot` | Current-transaction update/HOT pairs `(10, 10)` then `(11, 10)` in one explicit transaction; final row checked |
| 12 | `pg_rls` | Real separate non-owner login; absent context sees nothing; each tenant sees its own row; context resets; wrong-tenant write denied |
| 13 | `pg_notify` | Live notification works; newly subscribed listener has no past event; table scan recovers work; later live event also works |
| 14 | `pg_enum` | Uncommitted new enum label use rejected; committed addition permits storage; unchanged old Rust decoder rejects the new label |
| 19 | `sqlite_wal` | Old committed read allowed during write; second writer gets busy; stale reader gets BUSY_SNAPSHOT; fresh transaction succeeds |
| 20 | `sqlite_worker` | Current-thread Tokio task progresses while a submitted insert cannot finish; queue slots fill and excess job rejected; released lock permits one saved note |
| 21 | `sqlite_foreign_keys` | Deliberate unchecked orphan found; checked opens reject new orphans; RESTRICT and CASCADE exercised; reopening reapplies enforcement |

Every PostgreSQL run creates a unique schema. Completed runs and returned
errors attempt schema cleanup; a process kill or panic can leave a schema in
the disposable database. All queries use short statement/lock limits, and bin
entry points/tests have an overall bound. The RLS application pool uses one
connection to make transaction-context reuse observable.

## What the evidence cannot establish

These are correctness examples with tiny tables, not benchmark results. They
do not establish production latency, throughput, database capacity, power-loss
recovery, encryption, or complete application authorization.

HOT uses `pg_stat_xact_user_tables` inside the writing transaction, not cumulative
statistics read immediately after a commit. The controlled layout is important;
its counts are not a promised ratio for real tables. RLS protects ordinary SQL
under trusted tenant context, not an attacker allowed to set that context or run
arbitrary SQL as the service. NOTIFY is not durable work storage, a multiworker
claim protocol, or exactly-once external delivery. The enum decoder is retained
manual Rust code, not a test of a derive macro's generated decoder.

The SQLite file reopen check is not an operating-system crash test. WAL uses two
connections to a local temporary file and no network filesystem. The worker uses
one thread, a two-slot queue, one fixed writer conflict, and small replies; it is
not a cancellation framework or a payload-size limit. Foreign-key initialization
cannot repair existing orphans or authorize another user's project.

Per-article sources, prose counts, and claim limits are recorded in
`docs/editorial/sql-rust-writer-a.json`. Keep actual run/commit evidence there
or in the parent verification record; never replace a failed run with an
assertion that the example was expected to pass.
