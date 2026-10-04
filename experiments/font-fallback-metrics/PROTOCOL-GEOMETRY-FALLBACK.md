# PERF-056C geometry-first fallback preregistered protocol

Date locked: 2026-09-15, after PERF-056B failed and before the size-adjust sweep.

## Why one final metric arm remains

PERF-056B made the adjusted local face available, then varied ascent and descent
while holding total vertical metrics and glyph scale fixed. The fixed face matched
primary text rectangles exactly on home, writing index, and prose, but it changed
one Atlas line count and produced large accumulated position error on the code
article. The 97-point vertical sweep could not improve its derivation score at
all. This rejects vertical overrides as the remaining control variable, but not
`size-adjust`: unlike ascent/descent overrides, it changes glyph outlines,
advances, and the measured text rectangles themselves.

## Fixed search

Use the same available fallback source,
`local("Arial"), local("Liberation Sans")`, and sweep `size-adjust` from 90.00% to
115.00% inclusive in 0.25-point increments. This range brackets unadjusted
Liberation Sans, Next's 110.84% value, and the rejected 107.35% average-advance
value.

For each size, preserve the webfont's effective metrics by deriving ascent and
descent from Next's control products:

```text
effective ascent  = 88.78% * 1.1084
effective descent = 26.34% * 1.1084
candidate override = effective metric / candidate scale
```

Keep line gap zero. Use 1440 x 900 Chromium snapshots after the primary font has
loaded. Establish the real control by forcing `system-ui`, which is the fallback
actually used after the generated Arial face errors on this host. For every
stable visible Space Grotesk text node on all five fixed routes, compare the
primary and fallback range's left, top, right, and bottom coordinates.

Discard any candidate that changes a line count or introduces overflow. Among
the remainder, minimize the maximum per-route coordinate RMSE; ties minimize
pooled squared error, then distance from Next's 110.84%, then the lower size.
This minimax objective is fixed specifically to prevent excellent common-route
results from hiding a bad code or Atlas route.

The locked winner advances only if:

- all five route RMSE values are no worse than their actual `system-ui` control;
- both maximum-route and pooled coordinate RMSE improve by at least 50%;
- all candidate local faces report loaded; and
- no line count or overflow gate fails.

## Timing, fidelity, and decision

An eligible winner receives the original PERF-056 cold-load comparison and
retention gates: 160 alternating fresh-context navigations across both viewports
and five routes, desktop median CLS at least 75% lower per route with no sample
above 0.00025, mobile CLS zero, no material paired LCP regression, exact final
Space Grotesk rendering, no worse held-fallback geometry, resource parity, font
completion, and no runtime/preload/hydration errors.

Only a complete browser winner may be materialized in source and subjected to a
fresh production build and the repository checks. If this geometry-first arm is
ineligible or fails browser gates, stop metric tuning and retain the current
source. The excluded `font-display: optional` and `block` policies remain
excluded for the completion and LCP reasons in the original protocol.
