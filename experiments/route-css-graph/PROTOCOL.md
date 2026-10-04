# PERF-052 preregistered protocol

## Question

Can explicit core, writing, Rust, and editor CSS ownership reduce the CSS paid
by common routes while retaining a reusable shared core and the existing visual,
state, build, and Flight contracts?

## Fixed baseline

- Next.js 16.3.4.
- The retained PERF-050 webpack artifact in `.next-perf050`.
- Its shared application stylesheet is 84,663 raw / 14,945 gzip bytes.
- Representative routes: `/`, `/blog`, `/blog/async-rust-libraries`,
  `/blog/BufReader-rust`, `/rust`, `/rust-failure-atlas`, and `/editor`.
- Journey transfer is evaluated on home -> prose -> code -> Atlas, with a
  three-route prefix reported separately.

## Arms

1. Retained webpack control.
2. Turbopack with the original single Tailwind entry. This is the required
   negative control.
3. Experiment-only `core.css`, `writing.css`, `rust.css`, and `editor.css`
   entries under Turbopack graph chunking.
4. If an arm passes artifact gates, materialize its ownership map as explicit
   layout imports and build it with webpack. Turbopack is a search engine, not a
   production-bundler decision.

Graph mode is swept over the Cartesian product of:

- `requestCost`: 0, 4096, 20000, 100000.
- `weightDistribution`: 0, 0.1, 0.5.

Each build uses an isolated `NEXT_DIST_DIR`. Ordinary builds do not set the
`PERF052_*` variables and therefore retain Next.js defaults.

## Artifact gates before browser timing

- At least 20% or 3 KiB less route-frequency-weighted gzip CSS.
- At least 10% less cumulative CSS transfer by the third route of the fixed
  cold-cache journey.
- At most one extra median render-blocking stylesheet request.
- Repeated Flight share at or below 2% and repeated bytes at or below 10 KiB.
- Build wall time and peak RSS within 10% of the matched control.

The route-frequency weights and all byte accounting are written into the result
artifact; a stylesheet is charged once per cold route and once per journey when
its URL is first encountered.

The fixed synthetic route weights are home 25%, writing index 20%, prose article
20%, code article 10%, Rust index 10%, Atlas 10%, and editor 5%. They sum to one
and are a workload model, not production analytics.

## Correctness and browser gates

Only artifact survivors receive the paired browser matrix. Require:

- no route LCP median regression greater than 32 ms under the established Slow
  4G / 4x CPU diagnostic profile;
- exact screenshots for mobile and desktop, light and dark, initial and
  rapid-scroll states;
- identical computed-style and geometry probes with JavaScript enabled and
  disabled;
- CSS order and stylesheet lifetime correctness through rapid soft navigation;
- no new runtime or network errors.

Failure of an earlier gate stops later work and is reported rather than hidden
by a smaller follow-up sample.
