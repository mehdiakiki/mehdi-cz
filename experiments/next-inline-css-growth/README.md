# PERF-048: Full CSS inlining versus a cacheable stylesheet graph

## Decision

Do not enable Next.js `experimental.inlineCss` globally on this site. Keep the normal external stylesheet delivery as the production default. The flag creates a large, repeatable first-visit paint win on a high-latency mobile profile, but it pays for that win by duplicating all route CSS into HTML and RSC, retransmitting shared styles across pages, slowing the representative warm article reload, and more than doubling this site's generated `server/app` tree.

The next locally actionable growth item is narrower: remove the article-only Prism/KaTeX stylesheet from the initial render path when syntax-highlighted code or math is below the viewport, while keeping the shared Tailwind stylesheet externally cacheable. PERF-049 should test near-viewport promotion, fast-scroll safety, no flash of unstyled code/math, no CLS, and article-to-article cache reuse.

## Why this became the next item

PERF-047 left the unthrottled landing page near a laboratory floor, so PERF-048 began as a route-weighted survey rather than another micro-optimization. Fresh Chrome contexts at 390 × 844, DPR 2.75, Slow 4G, and 4× CPU covered the homepage, writing index, a representative long article, Rust Atlas, and the deferred search interaction.

The cold scouting traces converged on one route-wide bottleneck:

| Route         | Cold LCP | Render delay | CSS insight's estimated LCP/FCP saving |
| ------------- | -------: | -----------: | -------------------------------------: |
| Homepage      | 1,658 ms |     1,627 ms |                                 562 ms |
| Writing index | 1,667 ms |     1,655 ms |                                 561 ms |
| Long article  | 1,739 ms |     1,725 ms |                               1,121 ms |
| Rust Atlas    | 1,700 ms |     1,690 ms |                                 561 ms |

The detailed article trace found two render-blocking assets: the shared stylesheet and a route stylesheet containing both Prism syntax highlighting and KaTeX. Search was not an idle-load regression: its input appeared in 39.2 ms and its 105,161-byte encoded index remained intent-loaded. The recurring forced-reflow aggregate remained unattributed by the current DevTools trace model and carried zero estimated saving, so it was not promoted over the concrete CSS dependency chain.

## Hypothesis in plain language

An external stylesheet requires the browser to receive HTML, discover a `<link>`, request another file, and wait for it before painting. Inlining places the rules in the HTML, deleting that round trip. The catch is that a shared external file can be cached once and reused across many pages; inlined CSS travels inside every page. Next.js also serializes the same CSS into the RSC stream, so “inline once” currently means substantially more than one copy.

The falsifiable question was therefore not “is inline CSS fast?” It was: does deleting the CSS round trip improve cold LCP enough to justify the document, cross-page, warm-parse, and build-output costs on this real 1,564-page application?

## Controlled implementation

`next.config.js` now exposes two experiment-only environment switches:

- `NEXT_DIST_DIR` creates isolated build artifacts without touching the default `.next` build.
- `PERF048_INLINE_CSS=true` enables `experimental.inlineCss` only for the candidate build.

Both defaults are inert: the normal site keeps `inlineCss: false` and the ordinary `.next` directory. The matched builds used Next.js 16.3.4, React 19.2.8, and Node.js 24.20.0 with webpack:

```sh
NEXT_DIST_DIR=.next-perf048-external next build --webpack
PERF048_INLINE_CSS=true NEXT_DIST_DIR=.next-perf048-inline next build --webpack
```

The site's intentional invalid-TypeScript teaching fixture was staged outside the tree for each production build and restored immediately afterward. Both builds completed TypeScript validation and generated all 1,571 reported routes.

## A rejected first matrix

The first timing matrix compared the new inline build with the existing default build. Screenshots matched, but artifact inspection found that the default build was about 2½ hours older and its generated Tailwind stylesheet contained fewer rules. That makes byte comparisons—and potentially parse timing—confounded.

The first matrix was rejected. Both variants were rebuilt from the same final source snapshot. The corrected builds share the exact same 89,482-byte global CSS asset and SHA-256 hash. The article-only CSS changes slightly under the inline compilation path (27,851 versus 27,491 raw bytes); that is retained as behavior of the feature rather than normalized away.

The original all-at-once browser batch also failed when the DevTools transport closed. The replacement CDP harness writes the result file after every route/variant pair. A later browser failure can no longer erase completed evidence. This failure and correction are part of the experiment, not omitted from the story.

## Primary cold and warm-reload matrix

Each of five repetitions used a fresh isolated browser context. The first navigation was cold; the next load of the same URL reused that context's browser cache. Variant order alternated on every repetition. The primary effect size is the median of within-repetition inline-minus-external pairs, which is more robust than subtracting two independent medians when the host has a slow interval.

| Route / state   | External median LCP | Inline median LCP | Paired median delta |     Pair direction |
| --------------- | ------------------: | ----------------: | ------------------: | -----------------: |
| Home, cold      |              900 ms |            424 ms |             −480 ms |         5/5 faster |
| Article, cold   |            1,404 ms |          1,208 ms |             −372 ms |         5/5 faster |
| Home, reload    |              272 ms |            284 ms |              +12 ms |         3/5 slower |
| Article, reload |              404 ms |            548 ms |              +48 ms | 4/5 slower, 1 tied |

The cold win is real and large. The home result deletes one stylesheet gate; the article deletes two. The article's full `load` timing and long-task totals were noisy and often worse under inline CSS, so no completion-time claim is made. All 40 rows kept CLS at zero.

The complete cold encoded resource graph still grows despite the missing CSS requests:

| Route   | External encoded bytes | Inline encoded bytes |           Delta |
| ------- | ---------------------: | -------------------: | --------------: |
| Home    |                195,349 |              214,197 | +18,848 (+9.6%) |
| Article |                256,637 |              279,000 | +22,363 (+8.7%) |

Those totals include the document and Performance Resource Timing bodies. Transfer-accounted paired deltas, including response overhead, are +18,548 bytes on cold home and +21,763 bytes on cold article.

## Cross-page cache test

A warm reload can revalidate the HTML itself, so it does not fully represent a visitor moving through the site. A second five-repetition matrix primed one route and then performed a hard navigation to the other route in the same browser context.

| Journey        | External LCP | Inline LCP |         Paired LCP delta | External transfer | Inline transfer | Transfer delta |
| -------------- | -----------: | ---------: | -----------------------: | ----------------: | --------------: | -------------: |
| Home → article |       612 ms |     396 ms |     −232 ms (5/5 faster) |          73,729 B |       111,622 B |      +37,893 B |
| Article → home |       476 ms |     488 ms | −8 ms (mixed 3/5 vs 2/5) |          10,941 B |        45,619 B |      +34,678 B |

The external article journey transfers only 5,370 bytes of CSS because the shared stylesheet is already cached and only the route-local Prism/KaTeX file needs the network. That remaining file still blocks paint: removing all CSS links improves the paired article LCP by 232 ms. By contrast, returning to the homepage has no stable paint benefit from full inlining, yet retransmits 34,678 more bytes.

That asymmetry is the actionable clue. Shared global CSS should remain a reusable object. The article-only stylesheet deserves a separate experiment because its code and math rules are not used in the captured first viewport, yet the entire file gates the title, author, introduction, and hero image.

## Generated-output cost

Next.js documents two relevant limitations of `inlineCss`: it is global rather than per-page, and styles are duplicated once in the SSR `<style>` element and again in the RSC payload. This application makes the scaling cost visible:

| Build output under `server/app` |      External |          Inline |                    Delta |
| ------------------------------- | ------------: | --------------: | -----------------------: |
| All files                       | 723,018,074 B | 1,559,507,291 B | +836,489,217 B (+115.7%) |
| HTML                            | 277,535,093 B |   612,322,722 B | +334,787,629 B (+120.6%) |
| All RSC                         | 440,875,809 B |   940,105,386 B | +499,229,577 B (+113.2%) |
| Segment RSC                     | 293,430,909 B |   626,330,657 B | +332,899,748 B (+113.5%) |

The inline build also creates 1,563 additional `_index.segment.rsc` files—one for every prerendered HTML page except the root index—containing 144,546,240 raw bytes. This is independent real-content evidence for the scaling behavior reported in Next.js issue #95141. It does not by itself prove a production cold-start or deployment-time regression, but the storage and upload amplification is too large to ignore.

Representative document costs show why:

| Route   | External HTML raw / gzip / Brotli | Inline HTML raw / gzip / Brotli | Inline delta raw / gzip / Brotli |
| ------- | --------------------------------: | ------------------------------: | -------------------------------: |
| Home    |          51,869 / 9,602 / 8,031 B |     231,889 / 44,109 / 22,339 B |   +180,020 / +34,507 / +14,308 B |
| Article |       431,252 / 38,407 / 26,454 B |     666,458 / 81,368 / 44,833 B |   +235,206 / +42,961 / +18,379 B |

## Correctness guardrails

- The candidate replaces one homepage and two article stylesheet links with inline style resources; it emits zero external CSS requests in every measured inline row.
- Every one of the 60 timing rows has CLS 0 and the expected visible route identity.
- The 390 × 844/DPR 2.75 homepage images have identical SHA-256 hashes across variants.
- The article images also match byte for byte. The result is a delivery-only change, not a faster but visually different page.
- Search remains deferred and intent-triggered.
- The default configuration test proves the production path remains external; the opt-in environment test proves the experiment is reproducible.

## Framework finding and next experiment

The current Next.js feature exposes only an all-or-nothing boolean. The measured ideal lies between its two choices:

1. Keep one immutable shared stylesheet so later pages can reuse it.
2. Inline only the small rules needed for the shell's first viewport, if the duplicated RSC cost can be avoided.
3. Keep syntax and math rules out of the render path until the first `pre` or KaTeX node approaches the viewport, then promote early enough that scrolling never reveals unstyled content.
4. Preserve a normal stylesheet fallback for no-JavaScript rendering and test CSP compatibility.

PERF-049 should first solve the application-local Prism/KaTeX gate. If the winning mechanism requires route-aware critical CSS that the App Router cannot express safely, reduce it to a framework reproduction and contribute evidence to the existing Next.js critical-CSS and RSC-duplication work. No framework performance claim should be made until the minimized case retains streaming, soft navigation, hydration, CSP, and stylesheet-order semantics.

Current primary references:

- [Next.js `inlineCss` documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss)
- [Next.js issue #95141: inline CSS duplicated into RSC/segment output](https://github.com/vercel/next.js/issues/95141)
- [Next.js discussion #95167: current App Router CSS chunking and critical-CSS limitations](https://github.com/vercel/next.js/discussions/95167)

## Reproduction

With the two matched production servers and a Chromium remote-debugging endpoint running:

```sh
PERF048_EXTERNAL_ORIGIN=http://127.0.0.1:3123 \
PERF048_INLINE_ORIGIN=http://127.0.0.1:3122 \
node experiments/next-inline-css-growth/scripts/measure-cdp.mjs

PERF048_MODE=journey \
PERF048_EXTERNAL_ORIGIN=http://127.0.0.1:3123 \
PERF048_INLINE_ORIGIN=http://127.0.0.1:3122 \
node experiments/next-inline-css-growth/scripts/measure-cdp.mjs

node experiments/next-inline-css-growth/scripts/analyze.mjs
node experiments/next-inline-css-growth/scripts/inspect-build.mjs
node experiments/next-inline-css-growth/scripts/verify.mjs
```

Retained artifacts:

- `results/perf048-devtools.json` — route-selection and single-trace scouting evidence.
- `results/perf048-measurement.json` — 40 cold/warm rows.
- `results/perf048-journey.json` — 20 cross-page rows.
- `results/perf048-analysis.json` — group summaries and within-repetition deltas.
- `results/perf048-build-analysis.json` — route compression, generated-tree expansion, CSS identities, and visual hashes.
- `results/screenshots/` — exact-match viewport pairs.
