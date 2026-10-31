# Rust and AI articles for readers who use AI to write code

Prepared October 31, 2026. The author requested the final editorial pass, marking
and publication. The [release record](release.json) applies four reviewed
revisions and releases one new PostgreSQL MCP article. While this work was in
review, another batch published the filtered pgvector investigation. This batch
adds its comparison guidance to that existing URL. The separate vector draft
has no public page or November 1 release. Other approved calendars are unchanged.

The reader can ask an AI assistant to implement a query, handler or retry loop.
Help that reader choose the required behavior, investigate a plausible patch,
and assess the evidence. AI may help with those investigations as well. Avoid
claims about model limitations without a recorded model experiment.

## The six opportunities become five manuscripts

The current main branch already contains verified investigations of request
waits, stale SQLx metadata and lost commit replies. Improve those answers rather
than creating overlapping search pages. Connection ownership and hanging-request
diagnosis share the same existing canonical article.

| Manuscript                                                                        | Change      | Reader decision                                                              |
| --------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| [Request waits](rust-request-waiting-for-pool-or-postgresql.mdx)                  | Revision    | Choose a repair using the resource wait and the behavior it must preserve    |
| [SQLx metadata](sqlx-offline-build-stale-database-metadata.mdx)                   | Revision    | Separate query compatibility from the lock budget of deploying a migration   |
| [Lost commit reply](postgresql-commit-reply-lost-rust.mdx)                        | Revision    | Decide who owns operation identity when an agent retries or resumes          |
| [Read-only MCP tool](../../../data/blog/read-only-postgresql-mcp-tool-limits.mdx) | New article | Bound identity, privileges, time and returned text at the database operation |
| [Filtered pgvector search](pgvector-filtered-search-too-few-results.mdx)          | Revision    | Compare an approximate repair with an authorized exact reference             |

The four revision copies stay here as review snapshots. Their bodies match the
public editions. The original publication dates are retained and `lastmod`
records the update. The new article has an explicit review hash and publication
timestamps. All bylines and structured author data credit Mehdi Akiki alone.

## Editorial pass after the first CI run

The next pass found five claims or checks that needed more precision. The
[review record](review.json) describes each correction and fingerprints the exact
manuscripts it covers. It records a source and evidence pass by the current
assistant. It does not claim an independent reviewer. The later author request
to complete and publish the work is recorded in the release record.

The revisions now separate a transaction from a stable comparison snapshot,
observe later reads queued behind waiting DDL, inspect tenant state after a
failed or aborted transaction, and compare retry identity choices with a negative
control. The request article also makes the stale-input check atomic with its
write; a separate validation query could race again.

## Evidence and review

The [manifest](manifest.json) maps manuscripts to exact Rust excerpts and records
the public source revision each proposed edit starts from. Existing experiments
cover connection ownership, request waits, lost replies and metadata drift.
The new [database review fixture](../../../experiments/rust-backend/tests/ai_database_review.rs)
now contains four controlled checks:

- Observe the old reader blocking an additive migration and the waiting
  migration blocking a later read. Require SQLSTATE `55P03`, verify the later
  read recovers before the original reader ends, then retry the migration.
- Use a restricted login, colliding invoice IDs and one reused connection to
  check tenant isolation, denied writes, bounded output, statement cancellation
  and recovery after rollback or a task aborted after identity setup.
- Require sequential and HNSW plans with the same bound tenant and an explicitly
  checked Repeatable Read transaction, then compare their results.
- Arrange overlapping calls for one stored approved intent. Compare the single
  receipt and effect with two fresh attempt keys, then retry through a new pool
  and reject a foreign intent or a changed approved amount.

These are database and policy experiments. They do not compare live models or
measure production capacity. The MCP example covers the data operation, not the
complete protocol transport. Synthetic vectors isolate index behavior; they do
not establish semantic retrieval quality.

The existing Content safety workflow runs the Rust tests, checks excerpts,
builds the site, checks publication boundaries and public discovery paths, and
retains HTML review copies. No workload runs on the workstation. The original
release records remain intact; revised editions explicitly bind their prior
review hash to the new approved hash. Code execution does not establish an
independent editorial review.

During review, check that each addition changes a reader's decision and that the
evidence supports that decision. Keep the natural voice of the existing article.
Read the source and the rendered version. Check that proposed fixes preserve the
data contract, explain the cost, and state what remains uncertain.

## Source checks

Technical references checked on October 31 include the pinned
[SQLx query macro](https://docs.rs/sqlx/0.8.6/sqlx/macro.query.html),
[SQLx pool](https://docs.rs/sqlx/0.8.6/sqlx/struct.Pool.html),
[PostgreSQL row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html),
[ALTER TABLE locks](https://www.postgresql.org/docs/18/sql-altertable.html),
[connection defaults and timeouts](https://www.postgresql.org/docs/18/runtime-config-client.html),
[string functions](https://www.postgresql.org/docs/18/functions-string.html),
[pgvector 0.8.7](https://github.com/pgvector/pgvector/blob/v0.8.7/README.md#filtering),
and the [MCP tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).
