# PERF-044: Where the preloaded image waits after its bytes arrive

## Outcome

The remaining image LCP delay is not a second image-discovery problem. The retained PERF-042 preload already requests one correct 828w AVIF at High priority. PERF-044 separates what happens after that request starts and rejects both tempting production changes:

- changing Next/Image from `decoding="async"` to `decoding="sync"` regresses shaped LCP by 28 ms on the control-plane route and 20 ms on the load-balancer route;
- explicitly flushing the byte-identical HTML immediately after the target image regresses shaped LCP by 20 ms and 4 ms respectively.

No runtime change is adopted. The production image contract from PERF-042/043 remains intact.

The new actionable clue is narrower: with the same ten Low-priority startup-script URLs and the same script bytes received in the critical window, preventing Next/React/Flight execution improves shaped image LCP by 20–28 ms. On the much larger load-balancer document, reducing the full route to a viewport-identical, prose-tail-pruned shell exposes a 132 ms lower bound (800 to 668 ms), of which 101 ms is post-image-response delay (207.1 to 106.6 ms). That is a selective hydration/layout opportunity, not permission to remove article content or globally disable JavaScript.

## Question

PERF-043 retained the exact responsive preload but the independent DevTools trace still reported:

| LCP part               |       Time |
| ---------------------- | ---------: |
| TTFB                   |       7 ms |
| Resource load delay    |       8 ms |
| Resource load duration |       4 ms |
| Element render delay   | **108 ms** |

The 828w AVIF downloaded by 18 ms and completed main-thread resource processing by 22 ms, while the image was not presented as LCP until 125 ms. PERF-044 asks whether that gap belongs to image decode, stylesheet/layout readiness, compositor presentation, HTML parsing, or executable React/Flight work.

## Controls

The fixture proxy serves the generated production artifacts and proxies all CSS, JavaScript, and optimized images to the same Next.js 16.3.4 server and origin.

1. `full`: generated production HTML, unchanged.
2. `script-blocked`: byte-identical HTML with response CSP blocking scripts. This keeps the DOM/Flight text but removes script network and execution, so it is an upper-bound diagnostic rather than an execution-only control.
3. `script-inert`: all executable script tags become inert while the same ten modern startup URLs are fetched at their original parser positions with explicit Low priority. Raw traces assert equal URLs, priority, target-image request count, and script bytes received by image completion and LCP.
4. `prefix-flush`: byte-identical HTML compressed as two gzip writes, with `Z_SYNC_FLUSH` immediately after the target image container.
5. `decoding-sync`: only the target image's `decoding` value changes from `async` to `sync`.
6. `minimal-shell`: preserves the complete head/styles, header, author/sidebar, article hierarchy, heading, target image attributes, metadata, footer, and everything in the prose through the target image; only later prose and executable scripts are removed.

The final minimal shell is 21,077/20,815 raw bytes for control-plane/load-balancer versus 197,192/431,511 bytes for full. It has 170/173 element starts versus 747/2,860. Every 1,440 × 1,000 comparison, including the minimal shell, has zero changed pixels before the viewport bottom.

## Method

- Runtime: Next.js 16.3.4, React 19.2.8, Node.js 24.20.0, Puppeteer Core 25.10.0, Chrome 145.0.7632.159.
- Routes: `design-control-plane-distributed-database` and `load-balancer-sticky-sessions-course`.
- Viewport: 1,440 × 1,000 at DPR 1, where both target images are eligible for the media-gated preload.
- Profiles: unthrottled localhost and the established 150 ms latency / 200,000 B/s downlink / 93,750 B/s uplink profile.
- Clean timing: five fresh, cache-disabled browser contexts per route/profile/variant.
- Trace attribution: two additional fresh contexts per route/profile/variant. Trace-heavy rows are never mixed into timing medians.
- Ordering: route order alternates and variant order rotates each repetition.
- Final accepted matrix: 168 navigations. The rejected high-priority execution control adds another 28 retained rows.
- Browser observers: LCP, paint, layout shift, long task, target DOM discovery, first ResizeObserver delivery, target load, resource timing, navigation timing, selected candidate, and rendered geometry.
- Raw trace phases: HTML parser, JavaScript, background V8 parse, style/layout, image decode, pre-paint/paint, raster, and non-main-thread compositor work between target `ResourceFinish` and LCP.

Raw traces stay under `/tmp` because they are large. `perf044-measurement.json` records every path, byte length, and SHA-256; `analyze.mjs` refuses modified traces. An attempt to save the independent DevTools trace directly into the workspace was rejected by that service's configured-root boundary, so the DevTools summary is committed separately and repeatable traces use Puppeteer.

## Controlled timing result

Medians under the shaped profile:

| Route / variant                | Image response end |        LCP | Response end → LCP | Document response end → DCL |   CLS |
| ------------------------------ | -----------------: | ---------: | -----------------: | --------------------------: | ----: |
| Control / full                 |           749.9 ms |     816 ms |            66.1 ms |                    240.7 ms | 0.004 |
| Control / script-inert         |           749.5 ms | **796 ms** |        **50.2 ms** |                      5.5 ms | 0.004 |
| Control / script-blocked       |           659.9 ms |     724 ms |            64.4 ms |                      6.3 ms |     0 |
| Control / minimal shell        |           667.4 ms |     712 ms |            44.4 ms |                      1.5 ms |     0 |
| Control / prefix flush         |           742.7 ms | **836 ms** |            93.1 ms |                    235.0 ms | 0.004 |
| Control / sync decode          |           743.0 ms | **844 ms** |            98.6 ms |                    239.3 ms | 0.004 |
| Load balancer / full           |           592.6 ms |     800 ms |           207.1 ms |                    169.3 ms | 0.001 |
| Load balancer / script-inert   |           592.5 ms | **772 ms** |       **179.5 ms** |                      8.0 ms | 0.001 |
| Load balancer / script-blocked |           562.3 ms |     680 ms |           117.3 ms |                      7.7 ms |     0 |
| Load balancer / minimal shell  |           562.3 ms |     668 ms |           106.6 ms |                      1.9 ms |     0 |
| Load balancer / prefix flush   |           592.3 ms | **804 ms** |           211.3 ms |                    170.4 ms | 0.001 |
| Load balancer / sync decode    |           592.6 ms | **820 ms** |           227.4 ms |                    175.3 ms | 0.001 |

The control route's script-blocked 92 ms gain is almost exactly its 90 ms earlier image completion. Its remaining post-response delay barely changes, so calling that a 92 ms hydration win would be false. The load-balancer route behaves differently: blocking scripts advances the image by 30 ms and removes about 90 ms of post-response delay because the 431 kB document, 272 kB inline Flight text, and startup path no longer keep document/style readiness behind the already-complete image.

The execution-only `script-inert` control is the important middle point. Full and inert receive 8,116 script bytes by image completion/LCP on control-plane and 7,484/8,116 bytes by image completion/LCP on load-balancer. The image completion medians are within 0.4/0.1 ms, yet inert LCP is 20/28 ms earlier. That bounds the currently actionable execution/hydration contribution without assigning network savings to JavaScript execution.

## Trace attribution

Trace medians under the shaped profile are overlapping wall-time coverage, not additive slices:

| Route / variant              | Finish → LCP | Main-thread work | Style/layout | Image decode |  Paint | Raster | Compositor |
| ---------------------------- | -----------: | ---------------: | -----------: | -----------: | -----: | -----: | ---------: |
| Control / full               |      87.9 ms |          51.0 ms |      45.5 ms |       1.9 ms | 2.2 ms | 3.7 ms |     4.2 ms |
| Control / script-inert       |      48.6 ms |          38.9 ms |      33.5 ms |       3.2 ms | 2.4 ms | 4.8 ms |     3.1 ms |
| Control / minimal            |      38.0 ms |          28.5 ms |      24.9 ms |       1.2 ms | 0.7 ms | 4.0 ms |     4.0 ms |
| Load balancer / full         |     228.9 ms |         105.3 ms |      69.0 ms |       4.7 ms | 5.6 ms | 4.9 ms |     6.0 ms |
| Load balancer / script-inert |     179.4 ms |          70.6 ms |      50.0 ms |       4.6 ms | 8.3 ms | 4.4 ms |     5.4 ms |
| Load balancer / minimal      |     108.5 ms |          35.1 ms |      23.7 ms |       1.8 ms | 0.9 ms | 4.0 ms |     4.7 ms |

Decode and compositor presentation are real but small. The larger route's trace instead shows one remaining 12.9 ms HTML-parser interval and 69.0 ms of style/layout coverage after the image finishes. Its decisive frame contains a 46.9 ms Layout event before image paint. `decoding="sync"` raises decode coverage to 7.5–11.3 ms and approximately doubles raster coverage, matching its LCP regression.

The PerformanceObserver render delay and raw-trace finish-to-LCP window differ by a small trace-clock alignment delta and tracing overhead. Claims about LCP deltas use clean runs; phase claims use only the separate traces.

## Corrections and rejected paths

1. **Raw string equality was the wrong minimal-shell invariant.** Parse5 correctly normalizes `fetchPriority`/`srcSet` serialization to lowercase HTML attributes. The verifier now compares parsed target attributes and browser-selected URLs.
2. **The first script-inert control changed priority.** Plain script preloads promoted nine Low-priority chunks to High, moved image response end to 803/615 ms, and produced 856/844 ms LCP. That excluded dataset is retained in `perf044-script-inert-high-priority.json` and summarized by `perf044-script-inert-attempts.json`. The corrected control uses `fetchpriority="low"` at the original discovery positions.
3. **The first minimal shell removed visible sidebar semantics.** Its timing rows remain in `perf044-measurement-base.json` but are filtered out of the final merge. The final pruner removes only prose after the target image. It retains the accessible image name, heading, tags, next/previous links, back link, exact image geometry, and zero-pixel viewport parity.
4. **Synchronous decode is not an LCP shortcut.** It makes the browser do more decode/raster work in the critical frame and loses on both routes under the controlled profile.
5. **A server flush is not automatically an earlier paint.** The explicit gzip flush changes neither decoded bytes nor semantics and happens at the desired HTML boundary, but it loses under the controlled transport. Its 12–16 ms localhost improvement is not portable and is rejected.
6. **Disabling all startup scripts overstates the opportunity.** It changes network competition, readiness, hydration, theme/search/navigation behavior, and CLS. It is attribution evidence only.

## Decision and next experiment

PERF-044 returns `retain-async-decode-and-current-delivery; investigate-selective-startup-execution`.

Nothing in this result justifies an application or Next.js patch yet. The browser can already decode, raster, and composite the image in a few milliseconds. The next useful experiment should isolate the 20–28 ms execution delta by client boundary/chunk, then test whether any optional boundary can hydrate after the first image frame while preserving theme, search, mobile navigation, keyboard behavior, and interaction readiness. Only a minimized reproduction that retains this delay outside the site would justify a Next.js issue or patch.

The accepted-production network audit also finds one tag-route JavaScript chunk requested after LCP. It does not cause this LCP, but it is the next independent idle-transfer clue and should be attributed before changing link prefetch policy.

## Reproduction

Start the accepted production build on port 3121, then:

```bash
node experiments/image-publication-delay/server.mjs
node experiments/image-publication-delay/verify.mjs
PERF044_VARIANTS=full,script-blocked,prefix-flush,decoding-sync \
  PERF044_OUTPUT=perf044-measurement-base.json \
  PERF044_TRACE_ROOT=/tmp/perf044-traces \
  npm exec --yes --package=node@24.20.0 -- node experiments/image-publication-delay/measure.mjs
PERF044_VARIANTS=script-inert \
  PERF044_OUTPUT=perf044-script-inert.json \
  PERF044_TRACE_ROOT=/tmp/perf044-traces-low-priority \
  npm exec --yes --package=node@24.20.0 -- node experiments/image-publication-delay/measure.mjs
PERF044_VARIANTS=minimal-shell \
  PERF044_OUTPUT=perf044-minimal-shell.json \
  PERF044_TRACE_ROOT=/tmp/perf044-traces-minimal-final \
  npm exec --yes --package=node@24.20.0 -- node experiments/image-publication-delay/measure.mjs
node experiments/image-publication-delay/merge-measurements.mjs
npm exec --yes --package=node@24.20.0 -- node experiments/image-publication-delay/analyze.mjs
node experiments/image-publication-delay/analyze-script-inert-attempts.mjs
node experiments/image-publication-delay/audit-artifacts.mjs
npm exec --yes --package=node@24.20.0 -- node experiments/image-publication-delay/visual-check.mjs
```

The full primary measurement is already merged. The retained historical base file contains the first shell attempt; the merge always filters all base-shell rows and takes `minimal-shell` only from the corrected supplement, so the clean four-variant base command above and the retained source matrix both reproduce the same accepted set.

## Artifacts

- `fixture.mjs`, `server.mjs`: generated-artifact variants and same-origin proxy.
- `measure.mjs`: clean timing plus separate trace collection.
- `analyze.mjs`: trace-integrity checks, phase attribution, medians, comparisons, and guardrails.
- `verify.mjs`: byte/attribute/content-reduction invariants.
- `visual-check.mjs`: zero-pixel viewport and semantic checks.
- `audit-artifacts.mjs`: raw/gzip/Brotli document sizes and prefix-flush gzip size.
- `merge-measurements.mjs`: excludes the corrected controls' superseded rows and creates the 168-run final matrix.
- `results/perf044-{measurement,analysis,artifacts,visual,devtools}.json`: primary evidence.
- `results/perf044-{measurement-base,script-inert,minimal-shell}.json`: merge inputs.
- `results/perf044-script-inert-{high-priority,attempts}.json`: retained failed control and correction.
- `results/screenshots/`: two-route, six-variant viewport captures.
