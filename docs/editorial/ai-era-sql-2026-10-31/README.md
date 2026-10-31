# Rust and AI articles for readers who use AI to write code

Prepared October 31, 2026. These are manuscripts for author review. They have no
publication date or review approval. Article dates are creation metadata.

The reader can ask an AI assistant to implement a query, handler or retry loop.
Help that reader choose the required behavior, investigate a plausible patch,
and assess the evidence. AI may help with those investigations as well. Avoid
claims about model limitations without a recorded model experiment.

## The six opportunities become five manuscripts

The current main branch already contains verified investigations of request
waits, stale SQLx metadata and lost commit replies. Improve those answers rather
than creating overlapping search pages. Connection ownership and hanging-request
diagnosis share the same existing canonical article.

| Manuscript                                                                                    | Change            | Reader decision                                                              |
| --------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| [Request waits](rust-request-waiting-for-pool-or-postgresql.mdx)                              | Proposed revision | Choose a repair using the resource wait and the behavior it must preserve    |
| [SQLx metadata](sqlx-offline-build-stale-database-metadata.mdx)                               | Proposed revision | Separate query compatibility from the lock budget of deploying a migration   |
| [Lost commit reply](postgresql-commit-reply-lost-rust.mdx)                                    | Proposed revision | Decide who owns operation identity when an agent retries or resumes          |
| [Read-only MCP tool](../../../data/blog/read-only-postgresql-mcp-tool-limits.mdx)             | New draft         | Bound identity, privileges, time and returned text at the database operation |
| [Filtered pgvector search](../../../data/blog/pgvector-fewer-results-after-tenant-filter.mdx) | New draft         | Compare an approximate repair with an authorized exact reference             |

The three revision copies stay here until reviewed. Their public counterparts
retain their reviewed source and release records. The new blog manuscripts use
`draft: true`, `reviewed: false`, and Mehdi Akiki's sole-author metadata.

## Editorial pass after the first CI run

The next pass found five claims or checks that needed more precision. The
[review record](review.json) describes each correction and fingerprints the exact
manuscripts it covers. It records a source and evidence pass by the current
assistant. It does not claim an independent reviewer or author release approval.

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
builds the site, and retains private HTML review copies. No workload runs on the
workstation. CI evidence and any formatting changes are recorded after the run.
Code execution does not establish editorial approval or independent review.

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

Traffic potential remains an editorial hypothesis. Compare search clicks after
equally aged windows and keep the existing daily traffic metric for the site's
1,000-per-day milestone. Publication still follows the established review and
calendar process.
