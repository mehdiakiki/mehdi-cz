# PERF-055 preregistered protocol

Date locked: 2026-09-15, before any bounded-prerender build.

## Question

Can the self-hosted build prerender a deterministic popular subset of the blog
and Rust Failure Atlas while generating the long tail on first request, cutting
build output and resource use without weakening the exhaustive static export?

## Framework contract

This experiment follows the installed Next.js 16.3.4 contract:

- `generateStaticParams` may return a subset for a dynamic route.
- `dynamicParams = true` allows an omitted path to render on demand.
- the Node.js server cache stores a successfully generated path; static export
  does not support ISR and therefore must continue returning every visible path.
- isolated builds use the repository's existing `NEXT_DIST_DIR` seam, with a
  directory that stays inside the repository.

## Selection seam

`PRERENDER_BUDGET` is opt-in and supports `25`, `100`, or `250`. The value is a
per-family ceiling, so the two bounded generators return at most 50, 200, or 500
paths combined. The blog and Rust-failure generators each:

1. filter visibility exactly as before;
2. order by publication timestamp descending and then slug ascending; and
3. retain the first `PRERENDER_BUDGET` paths.

Recency is a deterministic popularity proxy because no route-level production
traffic export is available in the repository. It is adequate for measuring the
capacity curve, but a retained production policy must replace or validate it
with field popularity data.

When `PRERENDER_BUDGET` is absent, every visible path is returned. Whenever
`EXPORT` is truthy, every visible path is returned even if a budget is also set.
Unsupported, non-integer, zero, and negative budgets fail the build rather than
silently changing coverage.

## Build arms and order

Run clean Next.js 16.3.4 webpack server builds for:

1. `full`: no budget;
2. `budget-25`;
3. `budget-100`; and
4. `budget-250`.

Run three repetitions per arm after one common production Contentlayer build.
Use the fixed order below to expose warm-cache/order effects rather than choosing
an order after seeing timings:

- repetition 1: `full`, `budget-25`, `budget-100`, `budget-250`;
- repetition 2: `budget-100`, `budget-250`, `full`, `budget-25`;
- repetition 3: `budget-250`, `budget-25`, `budget-100`, `full`.

Every build starts from a removed experiment-owned scratch `distDir`. Record wall
time, the 25 ms sampled sum of process-tree `VmRSS`, build exit status, route
counts from the prerender manifest, and bytes/files for the full build directory,
`server/app`, direct blog artifacts, and Rust-failure artifacts. RSS can
double-count shared pages and is used only as a matched relative measurement.

The repository declares Node >=24.20.0, while the newest installed host runtime
is 24.11.1. All arms use the same 24.11.1 executable. A winner must be reproduced
in the pinned Docker Node 24.20.0 image before release qualification.

## Build gates

Compare medians with `full`. A bounded arm advances only if all hold:

- at least 50% fewer `server/app` bytes;
- at least 30% less total Next build wall time;
- at least 20% lower sampled peak process-tree RSS;
- the newest prebuilt blog and Rust-failure HTML/RSC artifact totals remain
  within 3% of their matched control;
- every expected priority path is present in the prerender manifest, every
  selected tail path is absent from its concrete route list, and each dynamic
  route retains an on-demand fallback; and
- the source/build metadata, publication filtering, canonical sitemap inventory,
  and ordinary no-budget behavior remain unchanged.

Failure of these artifact gates ends that arm before Docker or browser work.
Select the smallest passing budget; a tie favors the larger budget.

## Runtime, persistence, and export gates

Only a build-gate winner receives runtime work. Build one retained artifact and
test a prebuilt popular path plus a valid omitted tail path with `next start`:

- the tail returns 200 with the same title, canonical metadata, and content hash
  as the full-build control;
- its first response has `x-nextjs-cache: MISS`, its second is `HIT`, and the
  second completes within 10% or 100 ms of the prebuilt control;
- the cache entry survives a complete server-process replacement using the same
  persistent cache namespace;
- a missing slug remains 404; and
- intent prefetch followed by navigation does not produce an error or duplicate
  content variant.

The current Docker Compose service has no persistence for on-demand App-page
entries. An experiment-only custom cache handler may prove a safe version-scoped
persistent directory, but production Docker/Compose changes are retained only
after the runtime gates pass. A cache from one build must never be read by a
different build namespace.

Finally, run one `EXPORT=1 PRERENDER_BUDGET=<winner>` build and prove that its
blog and Rust-failure route counts equal the no-budget visible inventories. The
export output is experiment-owned and removed after its manifest is recorded.

## Browser and deployment gates

For a surviving arm, run at least 20 matched cold repetitions for a prebuilt
popular route and the first omitted tail route under Slow 4G / 4x CPU. Require:

- popular-route LCP and response timing within 3% or 32 ms of control;
- omitted-tail cold LCP at or below 2.5 seconds and within 300 ms of its prebuilt
  control;
- its second response within 10% or 100 ms of control;
- identical mobile/desktop light/dark screenshots, canonical metadata, and
  status; and
- no runtime, hydration, preload, or network errors.

Then build matched Docker control/candidate images on Node 24.20.0. Require at
least 20% lower final image bytes and record build/pushable-context time. Actual
deployment time and cross-container cache survival require non-production
infrastructure authority and are not inferred from local Docker timing.

## Decision rule

Retain only an arm that passes build, runtime persistence, exhaustive export,
browser, and Docker gates. Otherwise reject PERF-055 and leave ordinary builds
exhaustive. Report an unavailable infrastructure gate separately from a measured
failure.

## Execution note

The pre-measurement launch check reached the repository's intentional TypeScript
compiler-error fixtures under `experiments/rust-atlas/` and stopped before route
generation. The sweep therefore uses the repository's existing
`PERF_EXPERIMENT_IGNORE_TYPE_ERRORS=true` seam for every control and candidate
build. This changes no arm, order, metric, or decision threshold; the full
125-test publication suite passed before the sweep. No failed launch check is
counted as a repetition.

The nested sampler process also sets `NODE_OPTIONS=--no-warnings`. Without an
explicit `NODE_OPTIONS`, the sampled child exited before Next.js initialization
and emitted no diagnostic; the same command completed outside the sampler.
Suppressing process warnings makes the nested launch reproducible and is applied
identically to all arms.
