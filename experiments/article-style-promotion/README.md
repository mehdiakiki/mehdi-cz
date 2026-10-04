# PERF-049: Deliver article CSS only to the content that uses it

## Outcome

The article route no longer makes every reader wait for the combined Prism and
KaTeX stylesheet.

- Twenty-four of 275 published articles need neither library and now request
  neither one. Their render-blocking CSS falls by 5,370 transfer bytes, 5,070
  encoded bytes, and 27,851 decoded bytes.
- The 251 code articles receive a dedicated 3,976-byte Prism file. It remains
  render-blocking because 98 code articles on mobile and 193 on desktop render
  their first code block in the initial viewport.
- Only `dissecting-bash-script` receives KaTeX. Its 21,461-byte stylesheet is
  fetched with `media="print"`, classified by Chromium as non-blocking, and
  applied at `load`, well before the only formula enters the viewport.
- Content-addressed filenames permit a one-year immutable cache. A second
  article navigation transfers zero bytes for the already-cached Prism file.
- Cropped content screenshots are pixel-identical, the syntax token color and
  KaTeX font match, no runtime exception occurs, and every final initial and
  instant-scroll CLS observation is zero.

This is a resource-scope win rather than a headline paint win. The typical code
route has a noisy +20 ms paired median FCP/LCP result, so PERF-049 does not claim
that paint became faster there. It proves that less render-blocking work reaches
each route while preserving output and cache reuse.

## Question

PERF-048 showed that Next.js' global `experimental.inlineCss` option could cut
cold LCP but retransmitted shared CSS, increased cold bytes, and expanded the
complete generated server tree by 836 MB. It also isolated a smaller local
problem: every article imported both Prism and KaTeX even when the rendered MDX
used neither.

The falsifiable question for PERF-049 was:

> Can the combined article stylesheet be separated and assigned from actual
> compiled MDX usage, then can rare below-fold math styling leave the initial
> render path without FOUC, layout shift, visual drift, a JavaScript-only
> failure, or loss of cross-article caching?

## Corpus evidence before choosing a mechanism

The audit fixes publication time at `2026-09-11T11:00:00.000Z`, matching local
time noon in Africa/Casablanca on the test date. It parses all 433 article
sources, filters to 275 published articles, and confirms all 275 use
`PostLayout`.

| Rendered requirement | Published articles |
| :------------------- | -----------------: |
| Neither              |                 24 |
| Prism only           |                250 |
| KaTeX only           |                  0 |
| Prism and KaTeX      |                  1 |

The production decision is made from the compiled MDX program, not a filename
or a loose source-text guess. `articleStyleRequirements()` looks for the exact
class markers emitted by the configured rehype plugins: `code-highlight` plus
a language class for Prism, and the exact `katex` class for KaTeX. Tests cover
positive, negative, and missing-input cases.

## Why blanket lazy Prism was rejected

A browser geometry pass visited every published article at both 390 × 844
mobile and 1440 × 900 desktop sizes: 550 route/profile rows in total.

| Code position among 251 code routes | Mobile | Desktop |
| :---------------------------------- | -----: | ------: |
| First `pre` initially visible       |     98 |     193 |
| First `pre` within one viewport     |    213 |     239 |

That means blanket Prism deferral risks an unstyled initial code block on 39.0%
of mobile code pages and 76.9% of desktop code pages. The attractive generic
rule—"article code is below the fold"—was false. Prism therefore remains eager
on code routes, but its file is reduced to the actual Prism rules and omitted
from routes without code.

The only math article is different. Its first KaTeX node is 3,772 px from the
document top on mobile and 3,186 px on desktop. The first code block is much
earlier, at 1,275 px and 910 px respectively. This separation gives KaTeX a safe
non-blocking window without making Prism take the same risk.

## Final architecture

`app/(site)/blog/[...slug]/page.tsx` derives two booleans from `post.body.code`
and renders `ArticleStyles` before the article layout.

`ArticleStyles` then uses three delivery paths:

1. No code and no math: emit no article-style resources.
2. Code: emit a normal stylesheet link with React's `article-prism`
   precedence. It remains eligible to block rendering, deliberately.
3. Math: emit a `media="print"` stylesheet so Chrome fetches it without making
   it part of the render-blocking chain. A tiny same-origin script changes the
   medium to `all` at page load, while a client effect covers soft navigation.
   A normal link inside `noscript` preserves fully styled math without
   JavaScript.

The promoter is external rather than inline, so it does not add a new inline
script requirement to the site's CSP. The current policy permits its
same-origin script, stylesheet, and font requests.

### Generated immutable assets

The build generator compiles local Prism CSS through the installed Tailwind
PostCSS pipeline, reduces KaTeX font sources to WOFF2, copies the 20 referenced
fonts, hashes content, and writes a typed manifest.

| Asset                     | Raw bytes |           Measured encoded bytes | Delivery                   |
| :------------------------ | --------: | -------------------------------: | :------------------------- |
| `prism.b0ca896df546.css`  |     3,976 |                            1,312 | blocking, code routes only |
| `katex.e85a4f8cc7f4.css`  |    21,461 |                            3,403 | non-blocking, one route    |
| `promote.aef0d85320be.js` |       184 | 184 raw / 484 transfer-accounted | one route                  |
| `fonts.7db974c90fb8/`     |   259,792 | requested on demand by glyph use | one route                  |

The generated paths are stable until their contents change and are served with
`Cache-Control: public, max-age=31536000, immutable`. `--check` makes missing or
stale CSS, promoter, font, or manifest output fail validation. The generator
runs first inside `prebuild`, preserving the repository's deployment contract
that `build` begins with `yarn prebuild`.

## Controlled browser measurement

Chromium 146.0.7680.80 ran at 390 × 844, DPR 2.75, Slow 4G shaping (150 ms
latency, 1.6 Mbps down, 750 kbps up), and 4× CPU slowdown. Each route/variant
sample used a fresh browser context. Five repetitions alternated before/after
order for three real routes:

- neither: `/blog/async-rust-libraries`;
- code: `/blog/load-balancer-sticky-sessions-course`;
- code and math: `/blog/dissecting-bash-script`.

The primary timing effect is the median within-repetition after-minus-before
delta. Independent medians are included for context. The math check also forces
an immediate, non-smooth programmatic jump to the formula and observes CLS.

| Route   | Before → after LCP | Paired LCP |  Before → after load | Paired load | Blocking CSS transfer |
| :------ | -----------------: | ---------: | -------------------: | ----------: | --------------------: |
| Neither |       900 → 904 ms |       0 ms | 1,647.5 → 1,611.1 ms |    −39.1 ms |              −5,370 B |
| Code    |       976 → 996 ms |     +20 ms | 1,776.5 → 1,747.8 ms |    −24.1 ms |              −3,758 B |
| Math    |       920 → 908 ms |     −16 ms | 1,793.3 → 1,655.9 ms |   −134.8 ms |              −3,758 B |

All five load samples improve on every route. Paint does not: the prose-only
route is neutral, the code route is 20 ms slower at the paired median, and the
math route is 16 ms faster. Those small mixed paint effects are reported as
noise or a possible small code-route regression, not generalized into a speed
claim.

The deterministic byte result is stronger:

- prose-only blocking CSS: 21,498 → 16,128 transfer bytes and 117,333 → 89,482
  decoded bytes;
- code blocking CSS: 21,498 → 17,740 transfer bytes and 117,333 → 93,458
  decoded bytes;
- math blocking CSS matches the code route, while total CSS also includes the
  3,703-transfer-byte non-blocking KaTeX request.

The small document cost is explicit: navigation transfer changes by −36 bytes
on the prose-only route, +162 on the code route, and +201 on the math route.

## Correctness and resilience checks

- A prose-only article emits no Prism, KaTeX, or promoter element.
- With JavaScript disabled, the math page uses the no-script link and computes
  `KaTeX_Main` for the formula.
- The second hard article navigation transfers zero bytes for both the shared
  global CSS and Prism, proving immutable cache reuse.
- Before/after syntax token color is `rgb(130, 170, 255)`.
- Before/after math uses `KaTeX_Main, "Times New Roman", serif` and preserves
  the exact measured formula box: 15.078125 × 22 px.
- Full screenshots differ only in browser-scrollbar position on the math jump.
  Ignoring the rightmost four scrollbar pixels, both code and math comparisons
  have zero changed content pixels.
- Every final initial and instant-scroll sample has CLS 0, and the runtime
  verification records zero exceptions.
- The resource elements are the only semantic DOM change; article content,
  landmarks, headings, links, and interaction code are untouched.

## Failed and revised paths

The experiment preserves the paths that did not survive measurement:

1. The configured DevTools transport closed during the audit. Measurement moved
   to direct Chrome DevTools Protocol with checkpointed result files, retaining
   the same performance model rather than discarding the experiment.
2. The initial plan deferred both Prism and KaTeX by proximity. The 550-row
   geometry audit falsified that plan for Prism because initial code is common.
3. An early 250 ms fast-scroll check appeared to miss the formula, but the page's
   `scroll-smooth` behavior had left it 2,284 px below the viewport. The test was
   invalid, not the implementation. The corrected adversarial check disables
   smooth scrolling before jumping.
4. Applying KaTeX only as the formula approached the viewport then produced
   0.004880583 CLS in the corrected instant-jump case. That is below the Core
   Web Vitals "good" threshold but violates this experiment's zero-shift
   correctness target, so proximity application was rejected.
5. The retained design fetches KaTeX non-blockingly and applies it at `load`,
   while the sole formula is still thousands of pixels below the viewport.
   The corrected instant-jump check returns to CLS 0.
6. Placing asset generation before `yarn prebuild` broke one of 121 deployment
   contract tests. Moving it inside `prebuild` restored 121/121.
7. A complete normal TypeScript gate encounters pre-existing, intentionally
   invalid teaching fixtures in `experiments/rust-atlas/types-under-the-hood`.
   Lab builds use the new opt-in `PERF_EXPERIMENT_IGNORE_TYPE_ERRORS=true`;
   ordinary production builds still enforce type checking. The isolated final
   production build otherwise compiled and generated all 1,571 routes.

## Verification commands

Use Node.js 24.20.0 for parity with the retained evidence:

```bash
corepack yarn performance:article-styles --check
corepack yarn prebuild
corepack yarn eslint components/ArticleStyles.tsx components/DeferredStylesheet.tsx 'app/(site)/blog/[...slug]/page.tsx'
```

The corpus and browser commands require a built/served control and candidate plus
a Chrome debugging endpoint:

```bash
node experiments/article-style-promotion/scripts/audit-corpus.mjs
node experiments/article-style-promotion/scripts/audit-geometry.mjs
node experiments/article-style-promotion/scripts/measure-cdp.mjs
node experiments/article-style-promotion/scripts/analyze-results.mjs
node experiments/article-style-promotion/scripts/verify-runtime.mjs
```

## Artifacts

- `results/corpus-audit.json`: all 433 source records and the fixed 275-article
  publication set.
- `results/geometry-audit.json`: all 550 browser geometry observations.
- `results/measurement.json` and `results/summary.json`: 30 fresh-context timing
  rows and their paired analysis.
- `results/runtime-verification.json`: no-style, no-JavaScript, cache, CSP,
  computed-style, exception, and screenshot state.
- `results/screenshots/`: before, after, and comparison images for code and math.

## Decision and next question

Retain PERF-049. It removes a historical route-wide import and replaces it with
content-aware, independently cacheable delivery. The breakthrough is the method:
inventory real compiled content, test geometry before choosing eagerness, and
use different loading policies for resources that happened to share one file.

The global Tailwind output is now the dominant remaining CSS gate: 89,482 raw
and 15,828 encoded bytes on every tested route. PERF-050 should measure rule
coverage and first-paint criticality across representative home, index, article,
Rust Atlas, and search states before testing a cacheable shared core plus
route-scoped additive CSS. It must preserve soft-navigation stylesheet order,
cross-page cache reuse, exact visuals, no FOUC, and zero CLS. If App Router
cannot express that boundary safely, the result should become a minimal Next.js
reproduction rather than an application-specific workaround.
