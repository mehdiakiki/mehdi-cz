# PERF-051 preregistered protocol

## Question

Can a small critical stylesheet preserve complete first-viewport rendering while
the corrected PERF-050 shared stylesheet loads without blocking first paint, and
recover a meaningful part of PERF-048's cold-LCP ceiling without repeating its
whole-stylesheet transfer and build-output costs?

## Fixed baseline

- Next.js 16.3.4 webpack output in `.next-perf050`.
- Tailwind CSS 4.3.3 with automatic source discovery disabled.
- Shared CSS asset `/_next/static/css/ebc471532293f512.css`: 84,663 raw bytes
  and 14,945 gzip bytes in the retained build.
- Routes: home, writing index, prose article, code article, and Atlas.
- Viewports: 390 × 844 at DPR 2.75 and 1,440 × 900 at DPR 1.
- Controlled timing profile: 150 ms latency, 1.6 Mbps downstream, 750 kbps
  upstream, and 4× CPU slowdown.

The experiment uses the existing build through one matched proxy implementation.
It does not rebuild the application for each candidate or enable Next.js
`experimental.inlineCss`.

## Candidate construction

1. Run Beasties 0.4.3 against each built route as a conservative
   document-matching oracle. Record its output and size; do not treat it as
   viewport criticality or ship it automatically.
2. Build a first-viewport rule census from browser-matched rules for visible
   elements in light and dark mode at both viewports. Preserve enclosing
   `@layer`, `@media`, `@supports`, `@container`, `@starting-style`, `@property`,
   animation, font, and custom-property dependencies.
3. Form one shared union across the five route profiles. Prefer an external
   content-addressed core. Keep an inline copy of the same bytes only as an
   upper-bound control.
4. If the safe union exceeds 4 KiB gzip, test nested 2/4/8 KiB budgets only by
   removing rules whose absence is covered by the deferred full sheet before
   exposure. Record each rejected rule or budget; runtime coverage alone does
   not authorize deletion.
5. The full stylesheet remains immutable and byte-identical. It loads through an
   external-script promoter plus an eager `<noscript>` stylesheet. No inline
   event handler is allowed.

## Arms

- `control`: the retained single blocking shared stylesheet.
- `external`: blocking shared critical core followed by the original full sheet
  loaded without blocking first paint.
- `inline`: the identical critical-core bytes inline, followed by the same
  deferred full sheet. This is a ceiling and can lose on transfer economics.

All arms use the same origin, server, compression, response timing, application
artifacts, and URL topology apart from the declared CSS delivery treatment.

## Correctness gates before timing

- Exact final viewport pixels, computed styles, and geometry at initial light,
  footer, initial dark, open search, and mobile open-menu states.
- A separate first-paint screenshot taken before the full sheet applies, with no
  changed content pixel in the complete initial viewport.
- Rapid scroll immediately after response start must not expose an unstyled
  frame or add layout shift.
- JavaScript-disabled rendering must match the control across all five routes.
- Home → writing → prose → code soft navigation must preserve CSS order, one
  shared full-sheet identity, search/menu behavior, and the living document.
- Deep links, keyboard focus, reduced motion, print, and both responsive
  viewports must retain the relevant styles.
- No runtime exception, failed stylesheet, duplicate full-sheet transfer, or new
  mobile/paired desktop CLS is accepted.

## Timing design and decision gates

After correctness passes, alternate arm order within repetition and use a fresh
browser context for each cold load. Retain individual rows and within-repetition
paired differences. Run at least eight pairs per route/profile for the final
candidate and control; exploratory arms cannot supply the final claim.

Keep a candidate only if all conditions hold:

- home cold LCP improves by at least 150 ms or 10%;
- no tested route's paired median LCP regresses by more than 32 ms;
- blocking CSS is at most 4 KiB gzip;
- complete cold encoded bytes grow by at most 2 KiB;
- primed cross-route CSS transfer grows by at most 2 KiB;
- reload median LCP does not regress by more than 32 ms;
- `.next/server/app` would grow by at most 5% under a production materialization;
- every correctness gate above passes.

Lab results remain synthetic evidence. No field Core Web Vitals claim follows
without production RUM.

## Sources

- <https://web.dev/articles/extract-critical-css>
- <https://github.com/danielroe/beasties>
- <https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss>
- <https://github.com/vercel/next.js/issues/95141>

