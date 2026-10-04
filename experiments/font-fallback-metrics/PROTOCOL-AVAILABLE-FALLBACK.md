# PERF-056B available-fallback preregistered protocol

Date locked: 2026-09-15, after the PERF-056 smoke and before any active-fallback
geometry search or timing.

## Reason for the follow-up

The PERF-056 candidate changed all four fallback metrics in the CSS response, but
the five-route smoke produced bit-identical pre-swap rectangles and CLS. Browser
inspection then showed why: the generated `space_grotesk Fallback` face had
status `error`. On this Linux Chromium host, `local("Arial")` does not resolve as
a local `@font-face` source, so the font stack skips the adjusted face and uses
unadjusted `system-ui` (Noto Sans). Canvas measurements confirm that the host's
ordinary `Arial` family aliases to the installed Liberation Sans, while a literal
`local("Liberation Sans")` is available.

PERF-056 is therefore an inert delivery arm, not evidence that adjusted metrics
cannot help. PERF-056B changes the mechanism as well as the values and is kept
separate so the follow-up is not presented as part of the original preregistration.

## Candidate construction

Use one custom fallback family with
`src: local("Arial"), local("Liberation Sans")`. Arial remains first on platforms
where it exists; Liberation Sans activates the adjusted face in this Linux lab.
If neither exists, the existing `system-ui, arial` tail remains in place. This
experiment makes no claim about unmeasured operating systems.

Lock width adjustment at the previously derived 107.35%. That value minimized
the occurrence-weighted squared glyph-advance error over visible copy from all
five routes, improved RMSE by 25.3%, reduced the worst specimen error, and did
not change line count or overflow. On this host, explicit Arial and Liberation
Sans have identical measured advances for the diagnostic specimen.

The starting vertical descriptors preserve Next's effective metrics:
`ascent-override: 91.67%`, `descent-override: 27.20%`, and
`line-gap-override: 0%` at the 107.35% size adjustment.

Before measuring CLS or LCP, search one fixed vertical parameter:

- on home, prose, and Atlas at 1440 x 900, capture stable visible text-range
  rectangles under the loaded primary font;
- force the available adjusted fallback and sweep ascent delta from -12.00 to
  +12.00 percentage points in 0.25-point increments, subtracting the same delta
  from descent so total vertical metrics remain fixed;
- score the occurrence-weighted squared difference in range top and bottom from
  the primary snapshot; ties choose the smallest absolute delta, then the lower
  delta; and
- validate the locked delta on the held-out writing-index and code routes.

The vertical candidate advances only if it improves top/bottom RMSE by at least
50% on both the derivation and held-out sets, changes no line count, and adds no
overflow. Do not choose a second delta after timing.

## Browser and fidelity gates

An eligible candidate receives the same 160-navigation comparison defined in
the original protocol: eight alternating fresh-context pairs across two profiles
and five routes under 150 ms latency, 1.6 Mbps down, 750 kbps up, and 4x CPU.
The control is the untouched `.next-perf050` stylesheet. The candidate proxy may
replace only the generated fallback face with the locked custom face; production
HTML, JavaScript, webfont, preload, compression policy, cache policy, and
`font-display: swap` remain fixed.

Retain only if every original PERF-056 gate passes, including at least 75% lower
desktop median CLS per route, no candidate observation above 0.00025, mobile CLS
zero, no material paired LCP regression, exact post-font screenshots and
typography, no worse deliberately-held fallback geometry, resource parity, one
completed webfont request, and no runtime/preload/hydration error.

If the browser candidate passes, materialize it with documented Next.js 16.3.4
APIs: disable the generated local-font adjustment, put the custom fallback name
in `fallback`, define its `@font-face` in source CSS, and keep the generic tail.
A fresh build must emit the locked descriptors, preserve the same primary font
and `font-display: swap`, and pass existing static/performance checks. Otherwise
reject the source change.
