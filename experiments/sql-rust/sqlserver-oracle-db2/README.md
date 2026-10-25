# Rust examples for existing SQL Server, Oracle and Db2 systems

These eight examples support draft articles 5, 6, 7 and 24–28 in the proposed
SQL/Rust series. They are small integration fixtures, not replacement database
clients, migration tools or production import services.

Builds, formatting, tests and service runs belong in this repository's **existing
GitHub Actions workflows on their configured runners**. Do not run them locally
or submit jobs directly to Kubernetes. Real enterprise service checks remain
pending until an owner provides an approved service, trust configuration and the
native clients listed below. A successful compile or feature-free test run does
not stand in for those checks.

## Pinned Rust dependencies

The package is `sql-rust-enterprise-examples`, edition 2021. `Cargo.lock` was
produced by remote CI and records transitive dependency versions.

| Feature | Direct pinned dependencies | Additional build/runtime needs |
| --- | --- | --- |
| No default features | Standard library only | Rust toolchain in existing CI |
| `sqlserver` | Tiberius 0.13.0, Tokio 1.54.1, tokio-util 0.7.20 | Reachable real SQL Server, trusted certificate and intended hostname |
| `oracle-native` | oracle 0.6.3 | C compiler at build; matching Oracle Client libraries **18.1 or later** at runtime; reachable Oracle service |
| `db2-odbc` | odbc-api 29.2.0 | unixODBC development libraries at build on Linux; a registered **IBM** ODBC/CLI driver and a real Db2 LUW service at runtime |

The Oracle crate's general minimum client version is lower than this fixture's.
Our helper always sets a call timeout, which requires Client 18.1 or later. The
native Oracle libraries are dynamically loaded; compiling their Rust bindings
neither installs those libraries nor validates an OCI login. unixODBC is a driver
manager, not the IBM Db2 driver.

## Commands for the existing remote CI job

Run from the repository root. These are commands to configure in existing CI,
not instructions for workstation execution:

- Pure policy tests: `cargo test --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --no-default-features`
- Compile every native integration bin and tests: `cargo check --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --all-features --all-targets`
- Compile test executables without loading native clients: `cargo test --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --all-features --all-targets --no-run`
- Formatting check: `cargo fmt --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml -- --check`

The feature-free tests reject invalid/oversized batches and duplicate IDs,
retain integral decimal values beyond `i64`, reject unsupported numeric syntax,
and check that generated scratch identifiers stay within the legacy Oracle
30-byte limit. They exercise Rust policy only. They do not emulate SQL Server,
Oracle, Db2, OCI or the IBM driver.

## SQL Server service profile

Required for all four SQL Server bins:

- `SQLSERVER_HOST`: DNS name that must match the server's certificate.
- `SQLSERVER_PORT`: optional, defaults to 1433.
- `SQLSERVER_DATABASE`, `SQLSERVER_USER`, `SQLSERVER_PASSWORD`: disposable test
  database and intended SQL-authentication login.
- `SQLSERVER_EXPECT_VERSION`: exact approved `SERVERPROPERTY('ProductVersion')`
  string, supplied from the test service's recorded build.
- `SQLSERVER_CA_FILE`: optional trusted CA PEM file when the default Rustls trust
  roots do not establish the server's chain. Certificate checking remains on.

There is no `trust_cert` bypass. The shared helper requires encryption, checks
the server build, and prints that build without logging the password or full
configuration. An encrypted connection with unverified peer identity is not an
acceptable substitute for the configured service profile.

For writable fixtures, set `ALLOW_DB_FIXTURES=yes` only after selecting a
disposable database and an account allowed to create/drop the scratch objects.
This flag acknowledges the fixture's mutations; it does not grant database
permissions or authorize use of production data.

Run each command in the existing remote job with that profile:

- Connection/type probe: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features sqlserver --bin sqlserver_profile`
- Blocking probe: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features sqlserver --bin sqlserver_blocking`
- Plan collector: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features sqlserver --bin sqlserver_plans`
- Bulk transaction probe: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features sqlserver --bin sqlserver_bulk`

`sqlserver_profile` reads one synthetic row without creating application objects.
It checks bound integer 42 and a nullable Unicode text result within an overall
20-second deadline.

`sqlserver_blocking` needs `ALLOW_DB_FIXTURES=yes` and
`SQLSERVER_EXPECT_RCSI=0` or `1`. Run it against two owner-prepared disposable
database profiles, one for each RCSI mode. It never changes RCSI itself. A writer
updates one row from 10 to 11 and holds its transaction. The forced locking read
must fail with 1222. The ordinary READ COMMITTED read must fail with 1222 when
RCSI is off, or return the old committed 10 when RCSI is on. Both query creation
and result consumption are inside the matched result. The fixture rolls back
and drops its uniquely named `dbo.RUST_DEMO_*` table. Overall deadline: 30 seconds;
session lock timeout: 1,000 milliseconds.

`sqlserver_plans` needs `ALLOW_DB_FIXTURES=yes`, `SQLSERVER_PLAN_DIR`, and execution
plus `SHOWPLAN` permissions for the referenced databases, including `tempdb` for
this temporary-table query. It prints the database compatibility level. It
creates a connection-local table with 2,000 constructed rows and requests actual
plans for tenants 1, 2 and 1, expecting 1, 1,999 and 1 matching rows. It fully
consumes normal and plan result sets, accepts text or typed XML plan values,
requires a plan per request, and limits each stored document to two million
bytes after decoding. Files include attempt, tenant and plan indices. Its
30-second deadline bounds the whole program. It **does not assert** different
plan shapes, demonstrate PSP eligibility or establish a speedup. The artifact
limit is not a streaming allocation limit for arbitrary server output.

`sqlserver_bulk` needs `ALLOW_DB_FIXTURES=yes`. It creates a three-row fixture
with a primary key and nonnegative-quantity CHECK constraint. Bulk copy uses
explicit columns and `CheckConstraints`; the driver's default bulk options do
not turn that CHECK enforcement on. Assertions require three rows visible to
the writer then zero after rollback, three visible to another connection after
commit, application-side rejection of a negative quantity, and independent
server-side bulk rejection with 547 after bypassing the validator. The failed
connection is discarded and a second observer confirms that it added no row.
The helper accepts only 1–1,000 rows. Overall deadline: 30 seconds. No throughput
or safe ambiguous-commit retry result is claimed.

The two permanent scratch-table fixtures attempt cleanup. A killed or timed-out
job can leave tables behind; the disposable schema owner must inspect and remove
only that run's known objects. Connection-local `#PlanProbe` disappears when the
server closes its session. Do not point cleanup at a business table.

## Oracle native service profile

Required for all three Oracle bins:

- Installed Oracle Client libraries **18.1+**, with runtime loader and dependent
  system libraries configured for the CI process's architecture.
- `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING`: intended account and
  Oracle Net service/connection description.
- `ORACLE_EXPECT_VERSION`: exact expected `oracle::Version::to_string()` result
  for the approved service; record the actual server build independently too.
- Oracle Net trust/wallet and TCPS/server-name verification configured by the
  service owner where TLS is required. The helper does not manufacture that
  configuration from a hostname.

The helper explicitly disables autocommit and sets a five-second timeout per
database round trip. That is **not** a five-second login deadline or overall job
deadline. The remote workflow needs a bounded job lifetime as well.

Remote commands:

- Commit/rollback visibility: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features oracle-native --bin oracle_profile`
- Empty character semantics: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features oracle-native --bin oracle_empty`
- Integral NUMBER boundary: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features oracle-native --bin oracle_number`

`oracle_profile` additionally requires `ALLOW_DB_FIXTURES=yes` and permission to
create/drop a uniquely named scratch table in a disposable schema. It commits
an inserted ID 7/null note, reads it through another connection, updates then
rolls back, and requires the observer's next statement to retain a null note.
DDL is outside that transaction exercise because Oracle DDL implicitly commits.
Cleanup is attempted but may need owner intervention after interruption.

`oracle_empty` makes no persistent changes. Its independently specified expected
pairs are null -> None, empty VARCHAR2 -> None, one ordinary space -> Some(space),
and Ana -> Some(Ana). This checks that expression and driver profile, not CHAR
padding, every character set or empty LOB behavior.

`oracle_number` also makes no persistent changes. It checks integral
NUMBER(38,0) values 9223372036854775807, 9223372036854775808 and
99999999999999999999999999999999999999. The first must decode to the exact i64;
the latter two must fail narrowing. All must retain their exact integral text
through explicit TO_CHAR formatting and the bounded i128 parser. Fractions,
exponents, unconstrained NUMBER values and all possible rounding policies are
outside this fixture's contract.

## Db2 LUW native service profile

Provide an actual IBM ODBC/CLI driver registered with the runtime's driver
manager and a reachable **Db2 LUW** service. This profile does not establish
compatibility with Db2 for z/OS or IBM i. Configure the DSN's authentication and
TLS trust/identity settings using the instructions for the installed IBM driver.

Required environment:

- `DB2_DSN`, `DB2_USER`, `DB2_PASSWORD`.
- `DB2_EXPECT_SERVICE_LEVEL`: the exact approved service-level string returned
  by `SYSPROC.ENV_GET_INST_INFO()`, checked after trimming. The account may need
  an execute grant for that administrative function in addition to connection
  and ordinary SQL access.

Remote command: `cargo run --locked --manifest-path experiments/sql-rust/sqlserver-oracle-db2/Cargo.toml --features db2-odbc --bin db2_profile`.

The program checks the service level before running its bound VALUES query. It
requires one row with text representation 42, an actual NULL indicator and
ASCII text ready. A buffered cursor holds at most four rows with a 64-byte cap
per column and errors on truncation. The five-second query timeout request does
not bound native driver loading, login or the entire process; retain the remote
job deadline. This read-only fixture needs no mutation opt-in.

ASCII bytes do not prove complete Unicode handling. Before adapting this tool
to an export, add actual schema cases for encoding, nulls, empty text, field
bounds, stable ordering and restart behavior. Increasing buffer limits does not
repair an incorrectly decoded character set.

## Evidence required before marking native checks complete

Keep the CI run URL and exact source SHA, Cargo.lock, engine build and service
installation/image identity, database settings relevant to the example, native
Oracle Client/IBM driver versions, and the verified trust profile. Record the
actual assertion outcomes and any leftover cleanup work. Do not record real
credentials in artifacts.

The article snippets use `article-example` / `end-article-example` markers in
each Rust source. The prose calls the expected outcomes assertions for a future
service run; it does not invent sample integration output. The drafts remain
unscheduled with `draft:true` and `reviewed:false` pending separate editorial
and publication approval.
