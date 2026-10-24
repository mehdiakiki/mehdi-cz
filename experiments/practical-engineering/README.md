# Practical engineering fixtures

These examples support the held November 2026 engineering articles. They are
constructed fixtures, not production incidents or measured performance results.
Only run verification through the project's existing GitHub Actions workflows,
with runner selection unchanged. None of these commands was run on the workstation.

## Deterministic Node checks

Use the project's configured Node 24 version from the repository root:

```sh
node --test experiments/practical-engineering/tagging.test.mjs experiments/practical-engineering/mobile-rollout.test.mjs experiments/practical-engineering/traced-lookup.test.mjs
```

- `tagging.ts`: performs a completion call through the supplied engine, validates
  a limited tag set, rejects invalid/truncated results, and classifies initialization
  failure. Tests inject a fake engine and GPU adapter. They do **not** download a
  model or establish browser support, tag relevance, or privacy.
- The browser adapter's real integration dependency is **`@mlc-ai/web-llm@0.2.85`**.
  Its catalog includes **`SmolLM2-360M-Instruct-q4f16_1-MLC`**. Install that exact
  package in this isolated fixture package and retain the generated lockfile.
  The file imports the real SDK types, so the non-streaming completion call is
  checked against that version. Real browser/GPU/model validation remains a
  separate required check; the main site's dependency files are not changed here.
- `released-v1-decoder.mjs` is a deliberately retained fictional old client.
  `mobile-rollout.mjs` routes a known contract to the new representation and uses
  the old client's existing error envelope otherwise. Tests verify that direct
  exposure fails, the retained decoder survives the negotiated response, and a
  claimed capability never bypasses actor ownership checks. Positive rollout
  cases go through `handleOrder`, so denying every caller cannot pass them.
  It is not an actual
  mobile SDK or evidence about deployed app versions.
- `traced-lookup.mjs` accepts an initialized tracer and a pool adapter. Its tests
  verify async span lifetime, connection/query ordering, release on failure, and
  rethrowing. `db.pool.acquire` measures the whole `pool.connect()` operation,
  including new connection setup as well as queued acquisition. The fake tracer
  does not verify OpenTelemetry SDK context propagation,
  exporter setup, HTTP auto-instrumentation, or a real database driver's behavior.

Install the isolated package only in GitHub CI, retaining its lockfile for later
`npm ci` runs. The repository's TypeScript executable can then check SDK wiring
and the small React import example without building the website:

```sh
npm install --prefix experiments/practical-engineering --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci --prefix experiments/practical-engineering --ignore-scripts --no-audit --no-fund
node experiments/practical-engineering/check-webllm-sdk.mjs
yarn exec tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx experiments/practical-engineering/tagging.ts experiments/practical-engineering/report-history.ts experiments/practical-engineering/ReportPicker.tsx experiments/practical-engineering/next-report-page.tsx
```

The SDK type import is erased by Node 24 when the unit tests load the file.
No browser SDK factory or model download is called by those injected tests.

## Rust correctness check

In GitHub CI, compile and run this bounded example with the configured Rust toolchain:

```sh
rustc --edition=2021 -O experiments/practical-engineering/shared_counter.rs -o /tmp/practical-shared-counter
/tmp/practical-shared-counter
```

The example checks equal results for a fixed total across 1, 2, 4, and 8 workers,
plus empty work. It does not benchmark or claim a speedup. No third-party crates
are needed, and the input counts are deliberately small.

## PostgreSQL search mechanics

Use an isolated, disposable PostgreSQL database with a compatible pgvector
extension available. The runner must already have `psql`. Supply the connection
string through CI secrets/environment and do not print it:

```sh
psql "$PRACTICAL_DATABASE_URL" --no-psqlrc --set ON_ERROR_STOP=1 --file experiments/practical-engineering/postgres-search-trial.sql
```

The transaction creates temporary tables and rolls back, including extension
creation if newly needed. Never run it against production. It checks exact
identifier lookup, tenant filtering, generated full-text values after an update,
and removal from both lookup and vector results after deletion. It captures
lexical, vector, and rank-fused IDs for three labeled queries in `trial_results`.
The displayed rows and assertions use that same table: no unauthorized IDs may
appear, and each path must preserve the fixed fixture's expected ID order.
Failure to load pgvector is
a verification failure, not permission to skip the vector cases.

The three-dimensional vectors are hand-written coordinates. They test SQL and
lifecycle mechanics; they are not embedding-model output and cannot measure
semantic retrieval quality. No approximate index is created. Four document rows
cannot establish performance, index recall, or a database capacity threshold.

## Remaining release evidence

The articles include a clearly labeled illustrative PostgreSQL scan fragment and
two illustrative trace patterns; neither is claimed as a captured result. The
Next.js import example shows a small static report-history dependency, without
invented bundle-byte or interaction improvements. Production before/after
measurements, a real WebLLM device trial, and Deno Sandbox service-level permission
checks still require their own CI evidence before publishing measured claims.
