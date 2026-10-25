# MySQL, MariaDB and DuckDB article fixtures

These programs own `b_*` tables in disposable schemas. Do not point them at an application database. All builds, tests, formatting and execution belong in this repository's GitHub Actions workflows. No workstation execution is authorized.

## Pins and services

- Rust 1.94 or newer (SQLx 0.9.0 minimum); exact direct crate pins are in Cargo.toml and the remote-generated Cargo.lock must be preserved.
- `mysql:8.4.13` and `mariadb:11.4.13` services, each with a separate disposable schema and a user allowed to create/drop fixture tables.
- `MYSQL_URL` and `MARIADB_URL` must point at those schemas. The helper checks `SELECT VERSION()` against the pins.
- Set `SQL_RUST_DISPOSABLE=1` as a deliberate destructive-setup acknowledgement. TLS verifies server identity by default. `SQL_RUST_ALLOW_PLAINTEXT_CI=1` is only for the workflow's isolated service network; do not enable it for a remote deployed database.
- MySQL deadlock detection must be enabled. Connections set UTF-8, strict SQL mode, UTC session time zone and a short lock-wait limit.
- DuckDB crate `1.20000.0` uses linked engine `v2.0.0`. Set `DUCKDB_DOWNLOAD_LIB=1`; do not enable the `bundled` or Cargo `parquet` feature (the latter enables a bundled C++ engine build). The official prebuilt engine already includes Parquet support. The programs assert the linked engine version.
- The pinned wrapper's `.duckdb-release` records release `v2.0.0`, commit `d54cbbe3df17e8e5ce68312f483b4155836112aa`. This is a native dependency, not a pure-Rust database implementation.

## Exact GitHub CI commands

Run with the crate as working directory. Configure the service URLs through workflow environment variables; do not echo them into logs. Keep MySQL/MariaDB and DuckDB features in separate jobs so the SQLx job does not download/link DuckDB.

```sh
cargo test --locked --no-default-features --features mysql
cargo run --locked --no-default-features --features mysql --bin mysql_service
cargo run --locked --no-default-features --features mysql --bin mariadb_contract
cargo run --locked --no-default-features --features mysql --bin mysql_primary_key
cargo run --locked --no-default-features --features mysql --bin mysql_deadlock
cargo run --locked --no-default-features --features mysql --bin mysql_range_lock
cargo run --locked --no-default-features --features mysql --bin mysql_collation
cargo run --locked --no-default-features --features mysql --bin mysql_mariadb_json
cargo run --locked --no-default-features --features mysql --bin mariadb_history
```

With `DUCKDB_DOWNLOAD_LIB=1`:

```sh
cargo test --locked --no-default-features --features duckdb
cargo run --locked --no-default-features --features duckdb --bin duckdb_report
cargo run --locked --no-default-features --features duckdb --bin duckdb_parquet
cargo run --locked --no-default-features --features duckdb --bin duckdb_memory
```

The binary runs are the live-engine assertions. A successful compilation or a Cargo test result alone does not establish their SQL behavior. All programs must finish successfully; capture their stdout/stderr in the job artifacts. Run them sequentially because fixture setup drops its own tables. CI should impose an overall job/command timeout as well as the bounds in the programs.

### Native loader

The downloaded `libduckdb.so` is copied into libduckdb-sys's Cargo OUT_DIR and that in-target directory is added to the native search path. Cargo supplies the loader paths when it runs these test/binary commands. This is why the recommended verification invokes binaries through Cargo. A link-success-only check is insufficient: each DuckDB program must start and read `version()`.

Direct execution of a built Linux executable outside Cargo additionally needs a loader configuration. In the same CI workspace, first locate the staged library with `find target/debug/build -path '*/libduckdb-sys-*/out/libduckdb.so' -print`. Choose the directory matching the built dependency, then set `LD_LIBRARY_PATH` to that directory (preserving an existing value if appropriate). Do not assume target/debug/deps contains the library or copy an unrelated system DuckDB over the pinned one. A deployed package needs its own supported loader/package arrangement.

## Checks and limits

| Program | Assertions / observations |
| --- | --- |
| mysql_service | Accepted reservation, rejected shortage, duplicate insert rollback; stored stock/order counts. Not an idempotent HTTP service or concurrency benchmark. |
| mariadb_contract | Same Unicode, null, constraint and rollback contract against both engines; separate RETURNING capability probe. Not complete compatibility. |
| mysql_primary_key | Equal row counts; actual secondary-index plans and reported allocation. Tiny tables do not quantify storage savings or timings. |
| mysql_deadlock | Barrier establishes opposite first-row locks; exactly one 1213 victim; bounded whole-transaction recovery; ordered concurrent requests; final counts. Assumes deadlock detection enabled. |
| mysql_range_lock | Open indexed range locking read; expected 1205 under REPEATABLE READ; insert succeeds after release and during READ COMMITTED. Not a global isolation recommendation. |
| mysql_collation | Accent-insensitive unique-key collision and distinct Unicode byte encodings in VARBINARY. Not a complete account-name policy. |
| mysql_mariadb_json | Original raw duplicate-member text; stored text/path comparison; JSON null versus missing; invalid JSON rejection. No performance or full schema compatibility claim. |
| mariadb_history | Current state after update/delete and two historical values. No restore, point-in-time boundary, actor provenance or tamper-resistance claim. |
| duckdb_report | Known CSV totals and rejected bad numeric field. Three input records, not a scale study. |
| duckdb_parquet | 10,000 rows, multiple row groups, actual EXPLAIN, 10 selected rows and independent sum. No measured byte saving or timing. |
| duckdb_memory | 250,000 fixed rows. Mandatory 128MB baseline succeeds with count/sum. Lower-memory cases report checked completion or recognized OOM. Fresh connections/profile paths prevent stale evidence. Positive observed scratch metric alone supports a spill claim; missing metric remains unverified. |

The memory fixture uses 15-second engine query limits, one thread and at most 64MB configured scratch in its constrained case. The engine memory setting is not a process RSS cap. The result iterator avoids an extra application vector but does not guarantee streaming native execution or bound all native allocations. The fixture does not intentionally trigger a host OOM. Use workflow/container resource limits chosen by the repository owner.

## Primary references

- [SQLx 0.9.0](https://docs.rs/sqlx/0.9.0/sqlx/)
- [MySQL 8.4 InnoDB locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [MariaDB 11.4.13 release notes](https://mariadb.com/docs/release-notes/community-server/11.4/11.4.13)
- [DuckDB Rust client](https://duckdb.org/docs/2.0/clients/rust/overview)
- [DuckDB profiling metrics](https://duckdb.org/docs/2.0/dev/metrics)
- [Wrapper native-library staging source](https://github.com/duckdb/duckdb-rs/blob/main/crates/libduckdb-sys/build_linked.rs)

Article fences are contiguous excerpts between `article-example:start/end` in their matching source. Changes to source must be reflected in the held article and its writer manifest. No article output is fabricated from expected assertions.

The SQLx `mysql-rsa` feature supports MySQL8.4 authentication in the isolated CI service when its plaintext-only CI flag is set. Deployed connections still default to TLS with server-identity verification.
