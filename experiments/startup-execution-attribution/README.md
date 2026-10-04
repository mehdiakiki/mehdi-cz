# PERF-045: startup execution attribution and idle tag-route prefetch

PERF-044 left a matched-network bound of 20–28 ms between the unchanged page and a
network-equivalent page whose startup scripts could not execute. PERF-045 asks two
separate questions:

1. which startup execution class owns that interval; and
2. why a dynamic tag-route chunk appears after LCP without visitor input.

The useful production result is the second one. The first question produced a tighter
attribution, an important failed theme experiment, and a clear limit on what can be
claimed from a frame-quantized browser matrix.

## Runtime and routes

- Next.js 16.3.4, React 19.2.8, Node.js 24.20.0, Puppeteer Core 25.10.0, and
  Chrome 145.0.7632.159.
- Viewport: 1,440 × 1,000, DPR 1, light color scheme.
- Routes:
  `/blog/design-control-plane-distributed-database` and
  `/blog/load-balancer-sticky-sessions-course`.
- Every timing row uses a new isolated browser context with both browser and CDP cache
  disabled.
- The controlled profile applies 150 ms latency, 200,000 B/s down, and 93,750 B/s up.

The two real articles are deliberate natural controls. Their target image slot and
responsive candidate stay the same, while their generated documents contain about
112 kB and 272 kB of inline Flight data.

## Part 1: factorial startup execution

`fixture.mjs` transforms the built HTML while `server.mjs` proxies every asset back to
the same production server. Inert external scripts are paired with Low-priority script
preloads at their original discovery positions, preserving the ten modern script
requests while suppressing execution.

The primary matrix contains:

- `full`: unchanged production HTML;
- `framework-only`: external Next/React scripts execute, inline Flight does not;
- `flight-only`: inline Flight scripts execute without the framework runtime;
- `theme-only`: only the inline theme bootstrap executes; and
- `shell-only`: no startup script executes.

Five timing and two trace repetitions across two routes, two profiles, and five
variants produced 140 fresh-context navigations. Trace rows are not included in timing
medians.

Controlled timing medians:

| Route         | Full LCP | Framework only | Flight only | Theme only | Shell only | Full − shell |
| ------------- | -------: | -------------: | ----------: | ---------: | ---------: | -----------: |
| Control plane |   820 ms |         820 ms |      840 ms |     824 ms |     792 ms |       +28 ms |
| Load balancer |   800 ms |         800 ms |      788 ms |     804 ms |     768 ms |       +32 ms |

The repeated full-versus-shell result confirms PERF-044's small execution window. It
does **not** license additive blame for the individual components: the medians land on
browser frame boundaries, isolated scripts change when presentation work is scheduled,
and `framework-only` intentionally raises React minified error 412 because a framework
runtime without its Flight stream is not a valid application.

The traces provide the safer explanation. Before LCP, direct JavaScript coverage is
only 6.275 versus 4.302 ms on control-plane and 6.832 versus 4.388 ms on load-balancer.
Style/layout coverage is 43.857 versus 31.502 ms and 51.474 versus 45.697 ms. Startup
execution therefore costs roughly 2–2.4 ms directly and changes downstream
style/layout/presentation scheduling. It is not a hidden 30 ms JavaScript function that
can simply be deleted.

All primary rows preserve one target-image request, the 828w candidate, the target
image as LCP, geometry within 0.5 CSS px, and CLS no higher than 0.004.

## Failed follow-up: move the theme bootstrap into the head

The theme-only matrix suggested that applying the class earlier might recover one
frame on the long page: `theme-only` measured 804 ms median and `early-theme-only`
768 ms. A second controlled matrix used seven timing and two trace repetitions for
five variants across both routes: 90 fresh contexts.

The apparent win is rejected. Every one of the four traced `early-theme-full` pages:

- raised React hydration error 418; and
- requested the same LCP image twice, once from the parser and once during React's
  repair, doubling its measured encoded network bytes.

The timing rows often closed before the delayed repair became observable, which is why
the separate traces are essential. `next-themes` renders its bootstrap at the provider's
React-tree position; moving only the emitted DOM tag into `<head>` breaks that tree.
A safe version needs a hydration-preserving Next.js or library API, not string surgery.
Production keeps the existing theme placement.

## Part 2: attribute the late tag-route chunk

The late chunk came from visible article tags. `Tag.tsx` used a bare App Router
`<Link>`, whose default policy prepares visible links. Each article ends with seven tag
destinations. With no hover, focus, or click, every measured baseline page issued:

- 11 dynamic tag RSC requests in two waves; and
- one shared tag-route JavaScript request.

The requests begin after LCP, so they did not cause the remaining image-LCP delay.
They are nevertheless expensive idle speculation. Complete localhost observations
account for 132,111 transfer bytes on control-plane and 130,898 on load-balancer across
12 requests per visit.

The production change makes the tag pill reuse the existing `IntentLink` policy. That
component renders a normal crawlable anchor, sets Next Link `prefetch={false}`, and calls
`router.prefetch()` only on pointer hover or keyboard focus. Reuse is important: adding
a second client wrapper would have introduced another client reference for the same
policy.

The before/after matrix contains 80 fresh-context navigations: five repetitions, two
routes, two transport profiles, two phases, and both idle and 500 ms hover-then-click
modes.

| Mode             |           Before |           After | Result                                              |
| ---------------- | ---------------: | --------------: | --------------------------------------------------- |
| Idle             | 11 RSC + 1 chunk | 0 RSC + 0 chunk | 12 requests and about 131 kB removed                |
| Hover then click | 11 RSC + 1 chunk | 2 RSC + 1 chunk | only the chosen destination is prepared and reached |

The committed local journey transfers 21,252 bytes on control-plane and 20,908 on
load-balancer, about 84% below the previous automatic work. The two RSC observations
cover preparation and the subsequent navigation; this experiment does not label both
as duplicate prefetches.

LCP deltas range from −16 to +12 ms and reverse signs by route/mode. They are browser
jitter and frame quantization, not a defensible LCP win or regression. The accepted
claim is exact request/transfer avoidance after LCP.

Guardrails:

- 0 tag-route requests in all 20 after/idle rows;
- successful client navigation in all 20 after/intent rows;
- one target-image request and zero page errors in all 80 rows;
- 0 affected pixels on both representative desktop viewports;
- search opens and focuses through Control+K;
- the 390 × 844 mobile menu opens as a focused modal, retains all six links and a close
  control, and dismisses with Escape;
- a final independent DevTools trace reports 132 ms unthrottled LCP, 120 ms render
  delay, CLS 0, ten startup scripts, no Fetch request, and no tag-route chunk while idle;
- the focused repository suite passes 19/19 and the production Flight budget reports
  no violation.

The article and tag-route chunks also fall by 45/36 raw bytes (6 gzip bytes each)
because the existing client reference is reused. This is secondary to the idle network
policy change.

## Reproduction

The factorial fixture expects a current production `.next` directory and an app server
on port 3121. Use the declared Node runtime:

```bash
npm exec --yes --package=node@24.20.0 -- node ./node_modules/next/dist/bin/next start -p 3121
PERF045_UPSTREAM=http://127.0.0.1:3121 npm exec --yes --package=node@24.20.0 -- node experiments/startup-execution-attribution/server.mjs
node experiments/startup-execution-attribution/verify.mjs
```

Primary attribution matrix:

```bash
PERF045_VARIANTS=full,framework-only,flight-only,theme-only,shell-only \
  npm exec --yes --package=node@24.20.0 -- node experiments/startup-execution-attribution/measure.mjs
node experiments/startup-execution-attribution/analyze.mjs
```

Theme-position analysis and retained artifacts:

```bash
node experiments/startup-execution-attribution/analyze-theme-position.mjs
```

The checked-in tag-prefetch artifacts preserve both build IDs and source hashes. To
remeasure the current phase and then compare it with those retained inputs:

```bash
PERF045_PHASE=after PERF045_OUTPUT=perf045-tag-after.json \
  npm exec --yes --package=node@24.20.0 -- node experiments/startup-execution-attribution/measure-tag-prefetch.mjs
node experiments/startup-execution-attribution/analyze-tag-prefetch.mjs
npm exec --yes --package=node@24.20.0 -- node experiments/startup-execution-attribution/visual-tag-check.mjs
```

Raw traces live outside the repository under `/tmp/perf045-traces` and
`/tmp/perf045-theme-traces`; summarized, reviewable results are under `results/`.

Tooling failures are retained as part of the method. The first visual invocation used
the shell's Node 22.4.1, below the fixture's declared `>=22.12.0` engine, and failed to
load Puppeteer 25's ESM entry through the existing harness. It passes unchanged on the
pinned Node 24.20.0 command above. A direct final `yarn` budget invocation likewise
found global Yarn 1.22.22 instead of the repository's pinned Yarn 4.18.0; invoking
`corepack yarn` through Node 24 passed with zero Flight-budget violations. The root
prebuild passes 119/119 tests, while the global type-check still reports the repository's
intentional invalid Rust type-teaching examples. Staging only that unrelated fixture
outside the tree allowed the production compilation to complete, after which it was
restored immediately.

## Decision and next question

Keep the intent-only tag preparation. Reject theme-script relocation. Do not claim a
framework defect from the factorial controls.

The next locally actionable framework question is narrower: minimize why one page with
seven visible dynamic App Router links generated four small and seven larger idle RSC
requests plus the shared route chunk. Compare webpack and Turbopack and distinguish
documented partial/full dynamic-route preparation from avoidable duplicate work before
proposing a Next.js issue or patch.
