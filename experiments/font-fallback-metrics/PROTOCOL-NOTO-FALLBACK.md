# PERF-056D actual-system-fallback preregistered protocol

Date locked: 2026-09-15, after PERF-056C failed and before the Noto Sans sweep.

## Question

Can scaling the glyph design Chromium actually uses for `system-ui` reduce its
swap geometry on every route, without substituting the Arial-compatible design
that made the code route substantially worse?

## Fixed candidate search

On this host, explicit `system-ui` and `Noto Sans` produced identical diagnostic
advances, while the generated `local("Arial")` face failed. Define an
experiment-only face sourced only from `local("Noto Sans")`. Use its native
vertical metrics and sweep only `size-adjust` from 94.00% to 106.00% inclusive
in 0.10-point increments. The 100.00% arm is the identity control for confirming
that the custom face represents the current system fallback.

Use the same five-route, 1440 x 900 stable visible text-node snapshots and the
same left/top/right/bottom coordinate score as PERF-056C. The baseline remains
forced `system-ui`. Discard line-count or overflow failures. Select the arm with
the lowest maximum per-route RMSE; ties use pooled squared error, distance from
100%, and then the lower size.

The identity arm must reproduce the control within 0.01 px pooled and maximum
route RMSE. The winner advances only if every route is no worse than control,
both pooled and worst-route RMSE improve by at least 50%, every local face loads,
and line count/overflow stay unchanged.

## Terminal rule

An eligible winner receives all original PERF-056 timing and fidelity gates. If
the identity check fails or no geometry winner passes, stop fallback-metric
tuning. Do not add an operating-system-specific face, run the 160-navigation
timing matrix, or change source for an ineligible arm. `font-display: optional`
and `block` remain excluded by the branded-font completion and LCP contracts.

Execution note: the first launch stopped before collecting a route because
Chromium rejected the family-name source `local("Noto Sans")`. Font metadata and
an isolated browser probe showed that this installation exposes the full name
`Noto Sans Regular` (and PostScript name `NotoSans-Regular`) to `local()`. The
corrected launch uses `local("Noto Sans Regular")`; the search range, objective,
gates, and all candidate values remain untouched. The failed launch is not a
measurement repetition.
