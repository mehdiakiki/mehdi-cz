# Static content tier with selective enhancement

PERF-030 turns the behavior-free lower bound from PERF-029 into a working
architecture experiment. It replays the real production-built homepage and the
linked `reconciliation-cross-system-sync` article as ordinary HTML, preserves
their metadata, structured data, images, fonts, and content, and spends a small
framework-free module only on behavior that needs it.

PERF-030 keeps four delivery causes separate:

1. the current hydrated Next.js App Router route;
2. the selective-enhancement route with the complete production CSS;
3. the same route with CSS pruned against the complete static and interactive
   DOM for each page;
4. a shared union-pruned base plus an article delta, which tests whether a few
   more cold bytes buy better warm-route cache reuse.

This is a production-candidate boundary test, not a claim that every route
should leave React. It asks whether mostly static content benefits from a
different delivery tier while interactive application routes keep the
framework.

“Static” describes the generated content contract, not this fixture's Next.js
build label. The fixture reads `Accept-Encoding` and returns a prebuilt snapshot
through a `force-dynamic` Route Handler so it can apply the PERF-029 manual-gzip
control. A production tier should serve immutable precompressed artifacts or
negotiate them at the origin/CDN; the fixture is measuring browser behavior,
not proposing a per-request rendering architecture.

## Preserved behavior

- Normal links remain normal document links and get an intent-only document
  prefetch hint. Content documents use a 60-second browser freshness window so
  that a completed prefetch can satisfy the following navigation; production
  adoption requires deploy/CDN invalidation to bound staleness.
- Search has a real server-rendered `/hybrid/search?q=...` fallback. Pointer,
  focus, touch, click, or Command/Ctrl-K loads a small dialog module; only then
  is the unchanged search index requested.
- Mobile navigation uses a native modal dialog with Escape, backdrop close,
  focus return, and a no-JavaScript list of ordinary links.
- The newsletter form is inserted near the viewport and posts to a fixture-only
  mock endpoint. A no-JavaScript contact fallback remains in the document.
- The stored light/dark choice and operating-system preference are applied by a
  small inline head bootstrap. The production site currently exposes no theme
  switch, so the experiment does not invent one.
- Scroll-to-top remains a real `#top` anchor and gains visibility behavior after
  enhancement.
- A loaded Next/Image blur placeholder is removed by the small bootstrap, which
  closes the avatar-only visual gap observed in PERF-029 without React
  hydration.

The production article currently hydrates a **Scroll To Comment** button even
though no `#comment` target exists in either its built HTML or hydrated DOM.
The fixture omits that observed no-op instead of defining the defect as a
behavior contract.

## CSS pruning boundary

`prepare.mjs` parses every selector and retains it only when its classes and IDs
can occur in the complete page snapshot, including the initially closed menu,
search dialog, newsletter template, and the class attributes on `<html>` and
`<body>`. The last two are easy to overlook and contain the generated font
variable and global color utilities. It preserves `.dark`, ignores classes
inside `:not()`, keeps keyframes and declarations such as `@font-face`, and
removes empty conditional blocks. Full-CSS pages remain available as the
control. Visual comparison, responsive checks, and interaction checks are
required before interpreting a byte reduction as a safe result.

## Run

Build the real site first so the snapshot source is current, then run:

```bash
cd experiments/static-content-tier
npm run prepare
npm run verify
npm run measure
npm run build
npm run start
# In another shell, after the server is ready:
npm run measure:prerender-artifacts
npm run measure:prerender
npm run measure:abandon
npm run verify:prerender-browser
npm run verify:prerender-visual
```

The fixture listens on port 3120. The measured pages are:

- `/hybrid/full/home`
- `/hybrid/full/article`
- `/hybrid/pruned/home`
- `/hybrid/pruned/article`
- `/hybrid/shared/home`
- `/hybrid/shared/article`
- `/hybrid/prerender-immediate/home`
- `/hybrid/prerender-immediate/article`
- `/hybrid/prerender-dwell/home`
- `/hybrid/prerender-dwell/article`
- `/hybrid/search?q=reconciliation&variant=pruned`

Generated snapshots and copied assets are ignored so a stale production build
cannot silently become new evidence. Compact derived measurements belong in
`results/`; raw traces and screenshots should remain outside the repository.

Artifact size is not enough to establish user-visible speed. Use five isolated
cold mobile traces per page and variant, followed by repeated warm home →
article → back loops. Report medians and ranges, keep full and pruned CSS
separate, and treat localhost trace results as diagnostic lab evidence rather
than field Core Web Vitals or evidence of visitor growth.

## Result

The final direct-dependency audit checked every pin against the npm registry.
Next.js 16.3.4, React/React DOM 19.2.8, PostCSS 8.5.28, and both HAST utilities
were current; `postcss-selector-parser` moved from 7.1.0 to 7.1.6. A clean
locked install and rebuild produced byte-identical hashes for all six generated
CSS artifacts and left every measurement below unchanged.

The behavior-preserving tier came close to the PERF-029 zero-hydration lower
bound. The shared-pruned candidate removed 89.15% of the homepage and 85.79% of
the article's modeled initial gzip bytes while retaining one 1,672-byte gzip
bootstrap. It kept the production text, headings, images, metadata, and
structured-data hashes unchanged.

| Page / variant        | HTML gzip |              Startup JS | CSS gzip | Modeled gzip | Change from current |
| --------------------- | --------: | ----------------------: | -------: | -----------: | ------------------: |
| Home current          |   9,600 B |  146,234 B / 8 requests | 14,943 B |    170,777 B |                   — |
| Home full CSS         |   6,565 B |     1,672 B / 1 request | 15,933 B |     24,170 B |             −85.85% |
| Home route-pruned     |   6,568 B |     1,672 B / 1 request |  7,712 B |     15,952 B |             −90.66% |
| Home shared-pruned    |   6,568 B |     1,672 B / 1 request | 10,295 B |     18,535 B |             −89.15% |
| Article current       |  33,082 B | 158,138 B / 10 requests | 19,915 B |    211,135 B |                   — |
| Article full CSS      |  16,693 B |     1,672 B / 1 request | 20,896 B |     39,261 B |             −81.41% |
| Article route-pruned  |  16,698 B |     1,672 B / 1 request | 11,009 B |     29,379 B |             −86.09% |
| Article shared-pruned |  16,702 B |     1,672 B / 1 request | 11,623 B |     29,997 B |             −85.79% |

The deferred search cost is intentionally outside that initial model. Search
activation loads a 1,596-byte gzip module and the unchanged 101,103-byte gzip
index, for 102,699 bytes combined. An idle visitor pays neither cost.

### CSS result and discarded attempt

Independent pruning produced the smallest cold artifacts: home base CSS fell
from 15,933 to 7,712 gzip bytes, article base to 9,681, and the article delta
from 4,963 to 1,328. But these are different base files, so navigating from
home to article cannot reuse the home stylesheet. A union-pruned shared base is
10,295 gzip bytes and the article reuses it, requesting only the 1,328-byte
delta.

The first pruning pass omitted the class attributes on `<html>` and `<body>`.
That removed the generated font-variable selector and changed line wrapping:
203,108 of 1,316,640 screenshot pixels differed (15.426%). After adding those
root classes to the selector universe, every loaded mobile-light comparison
was pixel-identical. Shared/full comparisons were also exact at desktop-light
and mobile-dark. This is sampled viewport evidence, not a substitute for a
complete visual regression matrix.

### Cold-entry traces

All 40 cases below were captured in rotating interleaved order after an earlier
grouped run revealed time/thermal drift. Each cell is a median of five isolated
Chrome contexts at `390×844×2`, Fast 4G, 4× CPU slowdown, mobile/touch, and
light mode.

| Page / variant        |      LCP | DOMContentLoaded |     Load | Selected script time | Long-task blocking to visual completion |
| --------------------- | -------: | ---------------: | -------: | -------------------: | --------------------------------------: |
| Home current          | 572.4 ms |         481.1 ms | 855.2 ms |             279.4 ms |                                125.1 ms |
| Home full CSS         | 493.5 ms |         503.8 ms | 507.6 ms |               3.5 ms |                                 18.3 ms |
| Home route-pruned     | 543.1 ms |         428.0 ms | 490.6 ms |               4.0 ms |                                 17.7 ms |
| Home shared-pruned    | 506.7 ms |         420.3 ms | 470.9 ms |               4.0 ms |                                 15.0 ms |
| Article current       | 625.5 ms |         693.0 ms | 934.5 ms |             265.6 ms |                                243.9 ms |
| Article full CSS      | 580.9 ms |         596.1 ms | 599.8 ms |               6.4 ms |                                 92.8 ms |
| Article route-pruned  | 604.3 ms |         553.9 ms | 558.1 ms |               6.0 ms |                                 82.5 ms |
| Article shared-pruned | 588.9 ms |         539.2 ms | 543.3 ms |               5.4 ms |                                 75.7 ms |

Against current, full CSS improved median LCP by 13.79% on home and 7.13% on
the article. Shared-pruned improved it by 11.47% and 5.84%, while cutting load
by 44.94% and 41.86% and selected script time by 98.56% and 97.99%. Full CSS
was 13.3/8.1 ms faster at cold LCP than shared-pruned, but shared-pruned reached
load 36.7/56.5 ms sooner. Smaller CSS did not monotonically improve LCP, so the
data supports a Pareto choice rather than a universal winner.

The blocking column is `sum(max(task − 50 ms, 0))` through
`max(load, LCP)`. It is not Lighthouse TBT, whose observation window differs.
All cold runs had CLS 0.

### Warm forward navigation and back behavior

The warm test starts on home, hovers the article link for 400 ms, and measures
from the real click to the next contentful paint. Like the cold test, its 20
final cases were recaptured in rotating interleaved order after discarding a
grouped pass.

| Navigation             | Click → paint | Selected script time | Style/layout | Encoded response bodies | CLS |
| ---------------------- | ------------: | -------------------: | -----------: | ----------------------: | --: |
| Next client navigation |      334.4 ms |             276.0 ms |     144.4 ms |                50,160 B |   0 |
| Full-CSS document      |      381.1 ms |               5.5 ms |     108.6 ms |                32,217 B |   0 |
| Route-pruned document  |      384.1 ms |               5.1 ms |     101.5 ms |                38,332 B |   0 |
| Shared-pruned document |      382.0 ms |               5.8 ms |     105.2 ms |                28,497 B |   0 |

Next's client transition painted 47.7 ms (14.25%) sooner than the shared
document navigation. Shared-pruned transferred 43.2% fewer encoded response
bodies and used 97.9% less selected script time, but it still had to parse and
construct a new document. The completed intent prefetch was reused from the
60-second browser cache in every document run. The independently pruned route
was the smallest cold artifact but transferred the most bytes here because its
article base CSS could not reuse the homepage base. Cache topology outweighed
the isolated-file result.

Five additional interleaved home → article → back checks per architecture
restored the URL and exact 2,967 px source scroll position in every run. The
shared document returned through the back/forward cache in 5/5 samples. The
Next path uses client history and did not fire the source document's
`pageshow` listener. Neither path returned focus to the source article link.

Chrome exposed an experimental soft-navigation FCP marker but no comparable
soft-navigation LCP candidate. Document FCP equaled LCP in the selected runs;
the warm table therefore compares click-to-contentful-paint, not LCP.

## Decision

The experiment rejects both simple slogans:

- “Hydration is always faster” is false for cold entry, completion, transfer,
  and main-thread script cost on these content pages.
- “Plain documents are always faster” is false for the measured warm forward
  transition, where the hydrated router reused the live document and painted
  about 48 ms sooner.

The shared-pruned design is the best current production-candidate compromise:
it approaches the zero-hydration transfer floor, preserves behavior, improves
cold and completion metrics, shares CSS across content routes, and retains
bfcache returns. It is still a prototype, not a production switch. The next
experiment should test hover-triggered Speculation Rules prerender against the
same Next soft-navigation control to learn whether a prepared document can
close the warm 48 ms gap without imposing eager work on visitors who never
navigate.

## Durable evidence

- `results/artifact-measurement.json` — deterministic compression, semantic
  parity, CSS pruning, and deferred-search sizes.
- `results/cold-browser-measurement.json` — all 40 selected cold runs,
  medians/ranges, comparisons, and trace limitations.
- `results/warm-navigation-measurement.json` — all 20 selected warm runs,
  network reuse, medians/ranges, and comparison limits.
- `results/visual-parity.json` — exact comparisons plus the discarded pruning
  failure.
- `results/behavior-validation.json` — interaction checks and the interleaved
  back/scroll/bfcache result.
- `package-lock.json` — the isolated, audited dependency graph used by the
  final build.

## PERF-031: intent-triggered document prerender

PERF-030 found a real boundary rather than a universal winner. Its shared
static tier was dramatically cheaper on cold entry, transfer, and script work,
but the live Next.js router painted the measured warm article transition about
48 ms sooner. PERF-031 asks whether preparing the same ordinary document after
visitor intent can remove that reconstruction delay without making every idle
visitor pay for the destination.

The experiment adds two policies only to content links inside the shared tier:

- `prerender-immediate` inserts a dynamic list-style Speculation Rules block on
  pointer hover or keyboard focus;
- `prerender-dwell` waits 150 ms before inserting the same rule and cancels the
  timer if intent disappears;
- PERF-031 originally started touch immediately because it has no useful hover
  dwell; PERF-032 supersedes that choice with ordinary touch prefetch;
- pointer/focus abandonment removes an inserted rule, allowing Chrome to cancel
  or discard the speculation;
- unsupported browsers fall back to the existing document-prefetch hint;
- non-content links retain PERF-030's prefetch behavior, so the policy does not
  widen silently to the complete navigation graph.

The normal pages contain no automation or timing observer. The reproducible
runner opts into those helpers with `perf031-autorun=1` and
`perf031-measure=1`; contract tests prove that both modules are absent from
default documents.

### The measurement harness failed twice before it became valid

The first Chrome DevTools trace accepted the `speculationrules` script and
reported API support, yet the destination's `activationStart` stayed zero. The
browser command line revealed `--disable-background-networking`, so that tool
could not perform the background navigation being tested.

An isolated Puppeteer launch removed that flag but still navigated normally.
Chrome's `Preload.prerenderStatusUpdated` event supplied the decisive reason:
`PrerenderingDisabledByDevTools`. Merely seeing a rule in the DOM therefore
proves neither an attempted prerender nor an activation.

The retained protocol launches Chrome as an independent process, lets the page
drive the controlled journey, and does not inspect a page target until after
navigation. That produced `activationStart > 0` and the page lifecycle moved
from `prerendering` to `activated`. A debugger can be attached after that point
to read timing and behavior evidence without invalidating the attempt.

This constraint prevents an apples-to-apples repeat of PERF-030's DevTools Fast
4G and 4× CPU profile. PERF-031 therefore compares all three policies again in
one detached, unthrottled localhost harness and does not compare its absolute
milliseconds with the earlier trace table. Each result below is five fresh
browser profiles in rotating order. Chrome headless enforced an observed
`500×705` CSS-pixel viewport at DPR 2 despite a `390×844` window request.

### Startup price

The Speculation Rules controller adds one framework-free request and 1,342 gzip
bytes. The policy attributes add 27–29 gzip bytes to home and 37 bytes to the
article. The automation and navigation observer are query-only test helpers and
are excluded.

| Variant                | Page    | HTML gzip | Startup scripts | Script gzip |
| ---------------------- | ------- | --------: | --------------: | ----------: |
| Shared prefetch        | Home    |   6,568 B |               1 |     1,672 B |
| 150 ms dwell prerender | Home    |   6,595 B |               2 |     3,014 B |
| Shared prefetch        | Article |  16,702 B |               1 |     1,672 B |
| 150 ms dwell prerender | Article |  16,739 B |               2 |     3,014 B |

### Successful-intent result

The journey waits 500 ms after source load, emits pointer intent, dwells for one
second, and clicks. Click-to-FCP is calculated across documents from the source
click epoch and the destination's buffered paint entry. In every prerender run,
`activationStart` was non-zero and the destination reported `activated`.

| Policy                   | Activation | Median click → FCP |          Range | Change from shared prefetch |
| ------------------------ | ---------: | -----------------: | -------------: | --------------------------: |
| Shared document prefetch |        0/5 |           124.1 ms | 108.3–156.3 ms |                           — |
| Immediate prerender      |        5/5 |            29.2 ms |   28.9–33.2 ms |          −94.9 ms / −76.47% |
| 150 ms dwell prerender   |        5/5 |            32.1 ms |   27.3–35.7 ms |          −92.0 ms / −74.13% |

This reaches the earlier speculative target of less than 150 ms for this warm
interaction, but it is not a 32 ms cold page-load claim. The browser performed
the document fetch, parse, CSS work, script execution, and initial layout before
the click; PERF-031 deliberately measures whether that work was scheduled on a
high-confidence intent signal.

The `transferSize` on an activated destination describes its earlier
speculative navigation; it is not post-click transfer. The ordinary prefetch
control reports zero navigation transfer because its completed document came
from the browser cache.

### Abandoned-intent result

The inverse protocol emits pointer intent, then pointer-out without navigation.
Raw Chrome NetLogs are retained outside the repository. `URL_REQUEST_JOB_BYTES_READ`
supplies the compressed article-body attribution, while the committed result
stores all localhost response-body bytes for the full source/speculation run.

| Intent              | Policy              | Starts/cancels | Article document | All localhost encoded bodies |
| ------------------- | ------------------- | -------------: | ---------------: | ---------------------------: |
| 50 ms glance        | Shared prefetch     |     0/0 in 5/5 |         16,702 B |                     36,108 B |
| 50 ms glance        | Immediate prerender |     1/1 in 5/5 |         16,739 B |                     38,843 B |
| 50 ms glance        | 150 ms dwell        |     0/0 in 5/5 |              0 B |                     20,769 B |
| 1 s abandoned hover | Shared prefetch     |     0/0 in 5/5 |         16,702 B |                     36,108 B |
| 1 s abandoned hover | Immediate prerender |     1/1 in 5/5 |         16,739 B |                     38,843 B |
| 1 s abandoned hover | 150 ms dwell        |     1/1 in 5/5 |         16,739 B |                     38,843 B |

On localhost, removing the immediate rule after 50 ms was too late to recover
the transfer: the document and its required render resources had already
loaded. Compared with the same dwell-capable source before its threshold, that
glance performed four extra requests and 18,074 extra encoded body bytes. The
150 ms policy eliminated all of that work in 5/5 glances while preserving the
successful-intent latency result. A slower network could cancel earlier in the
transfer, so these byte totals are implementation evidence, not a universal
cancellation cost.

### Behavior, visual, accessibility, and unresolved Back automation

Three additional fresh-browser journeys per prerender policy activated in 6/6
total and retained the exact article heading plus a valid two-entry history.
After activation, the mobile menu opened and closed and search opened, focused
its input, fetched its index, and rendered results for both policies. Shared
versus dwell top-viewport screenshots affected zero pixels on home and article.

The mobile accessibility snapshot retained the named navigation, Search link,
menu button, main landmark, article, and heading structure. Lighthouse snapshot
scores were 92 accessibility and 100 for best practices and SEO. The two failed
audits were the pre-existing primary-color contrast and touch-target findings;
zero-pixel parity shows PERF-031 did not create them.

Back/bfcache remains deliberately unresolved for the activated target. Chrome
reported the correct two history entries, but Puppeteer's `goBack()`, page
`history.back()`, and `Page.navigateToHistoryEntry` did not move the detached
prerender target. PERF-030 already proved bfcache return for the shared document
control in 5/5 samples, but PERF-031 makes no new bfcache claim until a valid
activation-compatible Back harness exists.

Dynamic inline speculation rules also require a compatible production Content
Security Policy, including `inline-speculation-rules` when a strict
`script-src` would otherwise block them. The fixture has no CSP and therefore
does not claim that deployment check has passed.

### Decision

Retain the 150 ms dwell policy as the production-candidate configuration and
reject immediate pointer/focus prerender. Both produced approximately 30 ms
click-to-FCP after sustained intent, but immediate speculation spent the full
destination cost on every measured 50 ms glance. PERF-031 initially retained
immediate touch; PERF-032 supersedes that choice with ordinary document
prefetch after measuring short tap windows. Unsupported browsers keep normal
document navigation plus the existing prefetch fallback.

This is still a candidate, not a production rollout. The next safe boundary is
a small content-route cohort with CSP validation, browser-eligibility logging,
and field RUM. Lab activation success must not be translated into a visitor,
conversion, or production Core Web Vitals claim.

### PERF-031 evidence

- `results/prerender-artifact-measurement.json` — default-page HTML and startup
  script cost.
- `results/prerender-navigation-measurement.json` — 15 rotating successful
  journeys, activation proof, and click-to-FCP ranges.
- `results/abandoned-intent-measurement.json` — 30 rotating cancellation
  journeys and compact NetLog attribution; raw NetLogs remain in `/tmp`.
- `results/prerender-behavior-verification.json` — activation, enhanced controls,
  and history entries.
- `results/prerender-visual-parity.json` — zero-pixel home/article comparisons;
  raw screenshots remain in `/tmp`.
- `probe-prerender.mjs` — reproducible attached-debugger failure with Chrome's
  exact `PrerenderingDisabledByDevTools` status.
- `probe-prerender-detached.mjs` — minimal successful detached activation proof.
- `package-lock.json` — latest Puppeteer Core 25.10.0 and the zero-vulnerability
  audited dependency graph. The fixture declares Node `>=22.12.0`; measurements
  used installed Node 22.23.1 because the shell's Node 22.4.1 is below that
  dependency's supported engine.

Primary references: Chrome's [prerendering guide](https://developer.chrome.com/docs/web-platform/prerender-pages), Chrome DevTools' [Speculation Rules debugging guide](https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules), and the HTML Standard's [speculative loading model](https://html.spec.whatwg.org/multipage/speculative-loading.html).

## PERF-032: the intent threshold is a transport-dependent frontier

PERF-031 chose 150 ms from two endpoints: a 50 ms abandoned hover and a
one-second successful hover on unthrottled localhost. PERF-032 tests the space
between them. The fixture accepts query-only dwell overrides of 0, 75, 150,
and 250 ms, and the autorun can isolate pointer, focus, and touch. Ordinary
documents retain the 150 ms default and contain none of the override.

### A detached browser with an external transport shaper

DevTools network emulation cannot be used here because attaching the page
target suppresses prerender. `lib/transport-shaping-proxy.mjs` instead sits
between detached Chrome and the localhost fixture. It leaves the ready source
page unshaped, then applies response-start latency and one aggregate downstream
body budget to the article document and its subsequent resources.

| Profile     | Response-start delay | Aggregate downstream |
| ----------- | -------------------: | -------------------: |
| Controlled  |               150 ms |           1,600 kbps |
| Constrained |               300 ms |             750 kbps |

These are explicit experiment profiles, not aliases for a current Chrome
preset. The upstream response is buffered before shaping, upload is not
throttled, and the byte counter excludes headers. This isolates browser-facing
transport while deliberately excluding origin compute. Chrome's
[throttling settings](https://developer.chrome.com/docs/devtools/settings/throttling)
document why custom profiles should state their values rather than rely on a
name.

The proxy records target requests, planned/sent body bytes, completion, and
cancellation. Its integration test sends exactly 1,000 bytes through a shaped
response, then aborts another request before the header delay and verifies zero
body bytes. `measure-prerender-thresholds.mjs` runs each case in a fresh raw
Chrome process and inspects the page only after the action.

### Three setup failures changed the harness

The first pilot used `127.0.0.1` even though Chrome's isolation rule admitted
only `localhost`; the resulting error page produced no measurement. The second
pilot exposed that the shell's Node 22.4.1 was below this fixture's declared
`>=22.12.0` engine. That file is retained as discarded provenance, while every
selected screen was rebuilt, served, and regenerated with Node 22.23.1.

The proxy test initially appeared intermittent as a second test-file worker.
Running it with the fixture checks exposed `listen EPERM`: the agent sandbox
blocked ephemeral loopback sockets. It passes with the same approved loopback
boundary required by the browser benchmark. This was an execution boundary,
not a byte-accounting failure.

### Pointer results

The one-run screen covered 50, 100, 150, 250, 500, and 1,000 ms intent. At one
second, every prerender candidate reached 23–29 ms click-to-FCP versus 280.3 ms
for prefetch. At short durations, a non-zero `activationStart` did not guarantee
a fast click: the destination could still be waiting on its shaped dependency
chain.

Five rotating repetitions confirmed the 250/500 ms transition region:

| Policy              | 250 ms click median |          Range | 500 ms click median |          Range |
| ------------------- | ------------------: | -------------: | ------------------: | -------------: |
| Document prefetch   |            268.2 ms | 260.4–324.6 ms |            272.2 ms | 260.3–284.1 ms |
| Prerender at 0 ms   |            267.0 ms | 247.2–278.8 ms |             77.4 ms |  65.1–105.0 ms |
| Prerender at 75 ms  |            266.3 ms | 254.2–274.5 ms |            156.8 ms | 148.5–360.5 ms |
| Prerender at 150 ms |            329.7 ms | 325.8–341.4 ms |            235.7 ms | 231.1–239.9 ms |
| Prerender at 250 ms |            433.3 ms | 413.2–449.4 ms |            263.8 ms | 251.9–279.5 ms |

The 500 ms improvements versus prefetch were 71.57%, 42.40%, 13.41%, and
3.09% as the threshold moved from 0 to 250 ms. The 250 ms 0/75 deltas are too
small relative to their ranges to call wins. One activated 75 ms repetition
took 360.5 ms; activation is evidence that prerender happened, not a guarantee
that it finished the useful work.

Three-run pointer abandonment produced the other side of the frontier:

| Policy              | 250 ms abandon median |     Range | 500 ms abandon median |
| ------------------- | --------------------: | --------: | --------------------: |
| Document prefetch   |              16,702 B |  16,702 B |              16,702 B |
| Prerender at 0 ms   |              16,747 B |  16,747 B |              26,621 B |
| Prerender at 75 ms  |               5,000 B | 0–5,000 B |              25,286 B |
| Prerender at 150 ms |                   0 B |       0 B |              21,747 B |
| Prerender at 250 ms |                   0 B |       0 B |              16,747 B |

The 75 ms range straddles the first 25 ms shaper tick. At the exact 250 ms
boundary, click and pointer-out could also order differently against the dwell
timer. These are real boundary races, so policy should not attach semantic
meaning to equality with the configured timeout.

### The slower profile moves the crossover

The constrained profile is a directional one-run screen:

| Intent/case    | Prefetch | Prerender 0 | Prerender 75 | Prerender 150 | Prerender 250 |
| -------------- | -------: | ----------: | -----------: | ------------: | ------------: |
| 250 ms click   | 488.3 ms |    535.3 ms |     590.6 ms |      653.2 ms |      793.1 ms |
| 500 ms click   | 448.3 ms |    388.9 ms |     424.2 ms |      443.5 ms |      491.4 ms |
| 1,000 ms click | 428.4 ms |     25.0 ms |     104.4 ms |      183.8 ms |      303.5 ms |
| 250 ms abandon | 16,702 B |         0 B |          0 B |           0 B |           0 B |
| 500 ms abandon | 16,702 B |    16,747 B |     11,718 B |       4,687 B |           0 B |

At 250 ms, every prerender policy was slower even when Chrome reported
activation. At 500 ms, immediate improved 13.25%, 75 ms improved 5.38%, 150 ms
was effectively tied, and 250 ms regressed. A threshold therefore cannot be
selected independently of the destination weight and connection.

### Touch was revised, not grandfathered

The PERF-031 controller made touch prerender immediately. Five-run confirmation
showed that this regressed a 100 ms tap median from 320.3 to 337.4 ms and only
improved a 250 ms tap from 272.2 to 263.3 ms, with overlapping ranges. A 500 ms
tap could be much faster (93.0 versus 264.1 ms), but abandoned touch completed
seven requests and 26,621 body bytes rather than the prefetch control's one
request and 16,702 bytes.

The controller now gives touch an ordinary document-prefetch hint and ignores
the preceding `pointerover` when `pointerType` is `touch`, so it never arms a
touch speculation timer. Three repetitions of the realistic pointerover →
touchstart sequence at 100 and 250 ms recorded one `touchPrefetch`, zero
prerender starts, zero activations, and one 16,747-byte abandoned target request
every time. The revised candidate remained in the prefetch timing band: 312.3
versus 328.3 ms at 100 ms and 268.2 versus 264.2 ms at 250 ms. This removes
9,874 abandoned body bytes and six requests from the rejected policy.

Keyboard focus remains on the pointer dwell path. At 500 ms, the 150 ms policy
improved its three-run click median from 260.1 to 227.5 ms and increased
abandoned body bytes from 16,702 to 21,747.

### PERF-032 decision

There is no globally optimal fixed threshold. Immediate/75 ms maximize the
long-intent latency benefit, 250 ms minimizes abandoned work, and 150 ms remains
the conservative pointer/focus prototype rather than a production default. The
fixture rejects immediate touch prerender and now uses touch prefetch.

The next architecture to test is staged preparation: prefetch first, promote
to prerender after stronger intent, and cancel an incomplete speculation at
commit if that returns the short-click path to prefetch behavior. A production
choice still requires CSP validation, a bounded cohort, eligibility/activation
telemetry, a kill switch, and field distributions for intent and transport.

### PERF-032 evidence

- `lib/transport-shaping-proxy.mjs` — deterministic target transport and byte
  accounting.
- `measure-prerender-thresholds.mjs` — configurable detached-browser matrix.
- `results/perf032-pointer-screening.json` — 60 threshold/duration/action cases.
- `results/perf032-pointer-navigation-confirmation.json` — 50 successful-click
  runs.
- `results/perf032-pointer-abandonment-confirmation.json` — 30 cancellation
  runs.
- `results/perf032-constrained-pointer-screening.json` — 30 slower-profile
  cases.
- `results/perf032-focus-touch-immediate-confirmation.json`,
  `results/perf032-touch-immediate-screening.json`, and
  `results/perf032-touch-immediate-navigation-confirmation.json` — focus
  isolation and the rejected touch policy.
- `results/perf032-touch-prefetch-confirmation.json` — 24 post-change touch
  journeys.
- `results/perf032-pilot.json` — discarded unsupported-runtime calibration.

## PERF-033: prefetch first, then promote by stronger intent

PERF-033 turns the fixed dwell decision into a staged state machine. Pointer or
focus intent starts one document prefetch immediately. If intent survives 150
ms, the controller adds a Speculation Rule for the same URL. Pointer/focus
abandonment removes the rule but leaves the prefetch cache entry available. At
click, an experimental policy can retain the renderer or remove the rule before
normal link navigation.

All staged behavior is activated by bounded query parameters on the dwell
fixture. The route accepts `keep`, fixed-age `cancel`, or `adaptive`; guards are
limited to 150, 250, 350, or 500 ms. Ordinary server-rendered documents emit no
PERF-033 experiment-input attributes. The controller records promotions,
prefetch completion, commit ages, rule decisions, and activation. The proxy
separately records the article request's `Purpose`, `Sec-Purpose`, fetch
destination, bytes, and cancellation.

### Chrome reused the prefetched document

The request-attributed pilot observed one article request for each staged
journey. Staged requests used `Sec-Purpose: prefetch` and
`Sec-Fetch-Dest: empty`; dwell-only prerender used
`Sec-Purpose: prefetch;prerender` and `Sec-Fetch-Dest: document`. Promotion did
not download the article twice: Chrome reused the prefetched document and
continued the prerender dependency graph from it.

Controlled click-to-FCP medians were:

| Policy                                  |   100 ms |   250 ms |   500 ms | 1,000 ms |
| --------------------------------------- | -------: | -------: | -------: | -------: |
| Document prefetch                       | 312.2 ms | 260.4 ms | 272.3 ms | 248.4 ms |
| 150 ms dwell-only prerender             | 428.4 ms | 337.2 ms | 239.9 ms |  27.8 ms |
| Staged, always keep                     | 324.4 ms | 265.8 ms |  79.6 ms |  27.7 ms |
| Staged, fixed 250 ms cancellation guard | 336.3 ms | 260.5 ms |  80.3 ms |  27.8 ms |
| Staged, adaptive completion guard       | 324.4 ms | 260.4 ms |  75.7 ms |  27.5 ms |

At 250 ms, the adaptive branch removed all five roughly 100 ms-old
prerenders, produced zero activation, and matched prefetch at the median. At
500 ms, the prefetch had been complete for 251.6–271.6 ms, so all five
prerenders stayed and the median fell to 75.7 ms. At one second it reached 27.5
ms.

The constrained profile shows why observed progress matters more than only
prerender age. Its prefetch took 482.8–499.2 ms. The adaptive branch therefore
cancelled 3/3 500 ms prerenders and stayed in the prefetch band at 428.5 versus
428.3 ms. By one second, the document had been complete for 501.5–517.2 ms;
the branch kept 3/3 and reached 27.8 versus 424.3 ms for prefetch and 183.7 ms
for dwell-only.

### Cancellation works, but is not free

Removing the rule synchronously at a young controlled click produced
`activationStart === 0` in 5/5 runs, while the prefetched document remained
reusable. It also cancelled three unfinished subresource requests and created
thirteen target request attempts instead of the prefetch control's nine.

A wider 500 ms prerender-age guard was rejected. It suppressed activation 5/5
controlled and 3/3 constrained, but worsened the 500 ms median from 80.3 to
208.6 ms controlled and from 419.8 to 448.5 ms constrained. Cancelling a
mature renderer adds restart/scheduling cost.

Staging also pays a predictable false-positive price. At a 100 or 250 ms
abandonment, dwell-only transferred zero target body bytes while staged
preparation transferred the 16,739-byte article. At 500 ms, staged abandonment
cost 26,613 bytes controlled and 16,739 bytes constrained, versus 21,739 and
4,687 bytes for dwell-only. This is a latency-for-bandwidth choice, not a free
win.

### PERF-033 decision

Retain the adaptive branch as a query-only lab prototype: prefetch on initial
intent, promote after 150 ms, and remove the rule at click if prefetch has not
completed or has been complete for less than 150 ms. Supersede the fixed
prerender-age rule and reject its 500 ms guard. Production still needs a small
cohort, CSP and Save-Data/device checks, a kill switch, field intent/connection
distributions, and separate eligibility/promotion/cancellation/activation RUM.

The instrumented controller is 8,331 raw/2,082 gzip bytes, 740 gzip bytes above
the PERF-031 controller. A production version must remove measurement state and
pass its own artifact budget. Prefetch completion is observable; true hidden
prerender readiness is not, so the adaptive decision remains a measured
heuristic.

### PERF-033 evidence

- `measure-staged-prerender.mjs` — PERF-033 entry point for the shared detached
  browser runner.
- `public/hybrid/prerender.js` — staged and adaptive policy implementation.
- `lib/transport-shaping-proxy.mjs` — article header/body attribution.
- `results/perf033-controlled-pilot.json` — request-attributed 24-run pilot.
- `results/perf033-controlled-{short-intent,navigation,abandonment,adaptive}.json`
  — controlled confirmations.
- `results/perf033-constrained-{short-intent,navigation,abandonment,adaptive}.json`
  — constrained confirmations.
- `results/perf033-{controlled,constrained}-guard-500.json` — rejected wider
  cancellation branch.

Across those artifacts, PERF-033 retains 280 fresh detached-Chrome samples.
The fixture passes 12 contract/proxy tests and a clean Next.js 16.3.4 webpack
production build on Node 22.23.1.

## PERF-034: gate promotion on prefetch completion

PERF-034 tries to falsify PERF-033's eager promotion choice. All candidates
prefetch on initial pointer intent, require 150 ms sustained intent, and use the
same adaptive click-time cancellation rule. Only the promotion gate changes:

- `adaptive-eager-150-150` adds the Speculation Rule as soon as dwell reaches
  150 ms, including while prefetch is in flight;
- `adaptive-complete-150-150` waits for both dwell and the prefetch `load`
  event;
- `adaptive-settled-150-150-150` also waits 150 ms after prefetch completion.

The Route Handler accepts only enumerated gate and settle values and emits no
PERF-034 attributes without the complete query-only experiment shape. The
controller records gate deferrals and actual promotion time. The runner retains
click-to-FCP, activation, prefetch/prerender ages, article headers, request
attempts, cancellation, and sent/planned body bytes.

### Completion gating serialized useful work

Committed-navigation medians were:

| Profile/dwell        |         Eager at 150 ms | Gate on completion | Completion + 150 ms settle |
| -------------------- | ----------------------: | -----------------: | -------------------------: |
| Controlled 250 ms    | 280.6 ms, 0/5 activated |      284.8 ms, 0/5 |              272.6 ms, 0/5 |
| Controlled 500 ms    |            87.9 ms, 5/5 |      156.7 ms, 5/5 |              277.8 ms, 5/5 |
| Controlled 1,000 ms  |            31.7 ms, 5/5 |       29.5 ms, 5/5 |               32.7 ms, 5/5 |
| Constrained 250 ms   |           540.5 ms, 0/3 |      528.5 ms, 0/3 |              524.8 ms, 0/3 |
| Constrained 500 ms   |           468.6 ms, 0/3 |      452.6 ms, 0/3 |              461.0 ms, 0/3 |
| Constrained 1,000 ms |            52.2 ms, 3/3 |      227.1 ms, 3/3 |              382.3 ms, 3/3 |

At the controlled 500 ms boundary, waiting for completion regressed the median
68.8 ms/78.27% relative to eager promotion; adding the settle delay regressed
it 189.9 ms/216.04%. On constrained transport, the document completed later,
so the separation moved to one second: +174.9 ms/335.06% and +330.1
ms/632.38%. At controlled one second, all branches converged. A test
restricted to long intent would therefore have reported the gates as harmless.

Each branch still used exactly one article request with
`Sec-Purpose: prefetch`; the eager candidate did not win by downloading the
document twice. The evidence supports, but does not directly prove, that Chrome
can overlap useful prerender attachment, streamed document processing, or
dependency discovery with an in-flight prefetched response. It does prove that
prefetch `load` was too late as this promotion trigger.

### Abandonment did not justify the regression

Three-run median target body bytes were:

| Profile/dwell        |    Eager | Completion |  Settled |
| -------------------- | -------: | ---------: | -------: |
| Controlled 250 ms    | 16,739 B |   16,739 B | 16,739 B |
| Controlled 500 ms    | 26,613 B |   25,278 B | 16,739 B |
| Controlled 1,000 ms  | 26,613 B |   26,613 B | 26,613 B |
| Constrained 250 ms   | 16,739 B |   16,739 B | 16,739 B |
| Constrained 500 ms   | 16,739 B |   16,739 B | 16,739 B |
| Constrained 1,000 ms | 26,613 B |   25,278 B | 21,426 B |

The largest byte saving was real—9,874 B/37.10% for controlled 500 ms
abandonment—but it came with a 216.04% committed-navigation regression at the
same boundary. All policies had already paid the 16,739-byte document-prefetch
floor by 250 ms.

### PERF-034 decision and evidence

Reject both terminal gates. Retain PERF-033's eager 150 ms promotion and use
prefetch completion only for the later click-time keep/remove decision. The
same signal is useful at one state transition and harmful at another.

Next.js 16.3.4 still builds and serves these Route Handler documents, but the
measured path contains no hydration, Flight request, or App Router transition.
It tests browser-native HTML, cache, prefetch, and Speculation Rules behavior;
no Next.js defect has been demonstrated by this result.

- `measure-gated-promotion.mjs` — PERF-034 entry point.
- `measure-prerender-thresholds.mjs` — shared candidate matrix and summaries.
- `public/hybrid/prerender.js` and `prerender-autorun.js` — promotion gates and
  measurement state.
- `results/perf034-{controlled,constrained}-pilot.json` — 60 pilot runs.
- `results/perf034-{controlled,constrained}-navigation.json` — 72 repeated
  committed navigations.
- `results/perf034-{controlled,constrained}-abandonment.json` — 54 repeated
  abandonment runs.

Across those artifacts, PERF-034 retains 186 fresh detached-Chrome samples.
The instrumented controller is 10,208 raw/2,449 gzip bytes; its rejected gates
and measurement state are not a proposed production payload. The fixture now
passes 13 contract/proxy tests and a clean fixture-local Next.js 16.3.4 webpack
production build on Node 22.23.1. Two invalid build attempts used the
repository-root Next binary while resolving this fixture's separate physical
Next installation; the split async-storage singleton caused an internal
`workStore` invariant. They are invocation failures, not framework evidence.
The next mechanism experiment should compare progressive streaming with a
completion-delayed burst while holding document bytes and completion time
constant.

## PERF-035: matched completion, different body visibility

PERF-035 turns PERF-034's mechanism inference into a two-by-two controlled
experiment. The shaper gives the article document a dedicated delivery
schedule while keeping all destination subresources on the existing aggregate
budget:

- progressive delivery exposes proportional compressed-body chunks every 25
  ms;
- burst delivery exposes no body bytes until sending the complete body at the
  same scheduled completion point;
- each delivery mode is crossed with eager 150 ms promotion and promotion
  gated on the prefetch `load` event.

The manipulation deliberately holds article headers, body bytes, and finish
time constant. A dedicated document schedule means it is a mechanism isolation,
not a complete carrier model. PERF-034 already establishes the eager advantage
with all responses sharing the aggregate link.

### Factorial confirmation

Five-run median click-to-FCP values were:

| Profile/boundary      | Eager + progressive | Complete + progressive | Eager + burst | Complete + burst |
| --------------------- | ------------------: | ---------------------: | ------------: | ---------------: |
| Controlled, 500 ms    |             91.6 ms |               149.8 ms |      148.1 ms |         153.6 ms |
| Constrained, 1,000 ms |             35.8 ms |               186.0 ms |      191.6 ms |         198.0 ms |

The completion gate's penalty was 58.2 ms with controlled progressive delivery
but only 5.5 ms with matched burst delivery: a 90.55% collapse. Constrained, it
fell from 150.2 to 6.4 ms, a 95.74% collapse. All 40 confirmation runs
activated.

The matching checks passed across every run:

- one 16,753-byte article response;
- ten target requests and 27,659 target body bytes;
- article header timing spread at most 2 ms per profile;
- article-duration spread 2 ms controlled and 3 ms constrained.

### Request timing reveals the mechanism

Positive values mean the first destination subresource began before the article
finished:

| Profile     | Eager + progressive | Complete + progressive | Eager + burst | Complete + burst |
| ----------- | ------------------: | ---------------------: | ------------: | ---------------: |
| Controlled  |              +53 ms |                 −11 ms |         −6 ms |           −12 ms |
| Constrained |             +149 ms |                 −10 ms |         −6 ms |           −11 ms |

Only eager progressive delivery exposed and discovered dependencies before the
document completed. In the constrained runs, progressive body bytes first
became visible around 325 ms, the first image/font/base-CSS requests followed
around 330 ms, and the document completed around 479 ms. Merely inserting the
rule early did almost nothing under burst delivery, despite roughly 330 ms more
prerender-rule age.

The evidence therefore supports incremental browser parsing/resource discovery
as the dominant source of PERF-034's eager-promotion win. It does not instrument
Chromium's internal parser stack, and it does not turn this browser-native result
into a Next.js issue.

### PERF-035 decision and evidence

Retain eager promotion and preserve early body visibility. Final response time
alone is not an adequate readiness metric: equal-duration responses can expose
their dependency graphs at materially different times.

- `lib/transport-shaping-proxy.mjs` — progressive/burst schedules and timing
  accounting.
- `measure-streaming-promotion.mjs` — PERF-035 entry point.
- `analyze-streaming-promotion.mjs` — matching, dependency-lead, and interaction
  analysis.
- `results/perf035-{controlled,constrained}-pilot.json` — eight pilot runs.
- `results/perf035-{controlled,constrained}-navigation.json` — 40 confirmation
  runs with full request timelines.
- `results/perf035-analysis.json` — reproducible
  `supports-progressive-processing` decision.

PERF-035 retains 48 fresh-browser samples. PERF-036 below converts the broad
“stream early” conclusion into a measured compressed-byte boundary. Final
validation for this stage passed 14/14 contract/proxy tests, the reproducible
analyzer decision, and a clean fixture-local Next.js 16.3.4 webpack production
build on Node 22.23.1.

## PERF-036: the smallest useful compressed prefix

PERF-036 adds a bounded prefix schedule beside burst and progressive article
delivery. It writes exactly 1/2/4/8 KiB one tick after matched headers, holds
the remainder until the same nominal completion point, and always withholds at
least one byte. All six candidates retain eager adaptive 150 ms promotion.

The prespecified threshold requires a prefix median no more than 20 ms slower
than full progressive delivery, an early target request in every run, 100%
activation, identical bytes/request counts, and at most 5 ms document
header/duration spread.

### Prefix sweep

Five-run median click-to-FCP values were:

| Profile/boundary      | Burst | 1 KiB | 2 KiB | 4 KiB | 8 KiB | Progressive |
| --------------------- | ----: | ----: | ----: | ----: | ----: | ----------: |
| Controlled, 500 ms    | 151.9 |  99.6 |  99.7 |  79.6 |  91.6 |        91.5 |
| Constrained, 1,000 ms | 192.0 |  95.8 |  31.6 |  31.8 |  31.8 |        39.8 |

One KiB qualifies controlled but is 56.0 ms slower than progressive
constrained. Two KiB qualifies in both profiles and is therefore the retained
threshold. It is only 12.225% of the 16,753-byte compressed article. Prefixes
larger than 2 KiB yielded no monotonic improvement, and apparently faster
individual medians are treated as equivalent within scheduling noise rather
than proof that prefix bursts beat streaming.

Partial gzip decoding explains the boundary:

| Prefix | Decoded bytes | Available markup                                 |
| -----: | ------------: | ------------------------------------------------ |
|  1 KiB |         2,994 | hero/font hints; head incomplete                 |
|  2 KiB |         6,592 | both stylesheets, modules, `</head>`, body start |
|  4 KiB |        14,666 | complete head plus article body                  |
|  8 KiB |        34,000 | complete head plus more article body             |

The hero and font request began 53 ms early controlled and 147–148 ms early
constrained at both 1 and 2 KiB. The shared stylesheet moved from 2 ms after
article completion at 1 KiB to 52 ms before it controlled and 146 ms before it
constrained at 2 KiB. That newly visible render-blocking request coincides with
the constrained 95.8 → 31.6 ms step. Later stylesheet/module network starts do
not establish parser timing because the proxy observes requests, not
Chromium's internal discovery and priority state.

All 60 confirmation runs activated and retained one 16,753-byte article, ten
target requests, and 27,659 target body bytes. Duration/header spreads were
3–4/2 ms. With the 12 pilots, PERF-036 retains 72 fresh-browser samples.

### PERF-036 decision and evidence

The analyzer returns `supports-2048-byte-early-prefix`. This is a controlled
browser mechanism result, not yet a Next.js defect or proof of production
delivery: the fixture buffers level-9 gzip and the external proxy controls byte
visibility.

- `measure-early-prefix.mjs` — bounded-sweep entry point.
- `analyze-early-prefix.mjs` — matching, threshold, dependency, and partial
  gzip analysis.
- `results/perf036-{controlled,constrained}-pilot.json` — 12 pilots.
- `results/perf036-{controlled,constrained}-navigation.json` — 60 confirmations.
- `results/perf036-analysis.json` — reproducible decision and prefix map.

Final validation passes 15/15 contract/proxy tests and a clean fixture-local
Next.js 16.3.4 webpack build on Node 22.23.1. PERF-037 should reorder the same
critical tags ahead of long metadata and test whether a resource-first 1 KiB
capsule can reproduce the present 2 KiB result without content or behavior
loss.

## PERF-037: make 1 KiB sufficient by changing head order

PERF-037 compares five eager adaptive candidates: original 1 KiB, CSS-first 1
KiB, resources-first 1 KiB, original 2 KiB, and original progressive. The two
reorders retain charset/viewport and hero/font preloads first, then move either
the existing stylesheets or all fixture resources ahead of verbose metadata.
They add and remove no tags.

Five-run median click-to-FCP values were:

| Profile/boundary      | Original 1 KiB | CSS-first 1 KiB | Resources-first 1 KiB | Original 2 KiB | Progressive |
| --------------------- | -------------: | --------------: | --------------------: | -------------: | ----------: |
| Controlled, 500 ms    |           91.3 |            79.7 |                  87.7 |           91.4 |        75.5 |
| Constrained, 1,000 ms |           95.6 |            35.4 |                  27.8 |           27.8 |        32.0 |

CSS-first improves the fixed 1 KiB prefix by 11.6 ms controlled and 60.2 ms
constrained, ending only 4.2/3.4 ms behind progressive. It is preferred over
resources-first because both qualify but CSS-first moves fewer token
categories and resources-first has no consistent cross-profile advantage.

The shared stylesheet moved from 2 ms after document completion to 53 ms
before it controlled and 148 ms before it constrained. Hero/font leads stayed
unchanged. The level-9 gzip documents are 16,753/16,751/16,759 bytes, while all
three decode to exactly 69,954 bytes with identical bodies and head-token
multisets. Both sampled visual comparisons report zero affected pixels and
matching browser-parsed metadata.

The analyzer returns `supports-css-first-1024-byte-head-capsule`. Across ten
pilots and 50 confirmation runs, all 50 confirmation navigations activated,
request count remained ten, and article duration/header spreads remained
3–4/1–2 ms.

Artifacts:

- `measure-head-ordering.mjs` and `analyze-head-ordering.mjs` — measurement and
  acceptance decision.
- `verify-head-ordering.mjs` — browser semantic and visual parity.
- `probe-shared-cache-policy.mjs` — response-header and conditional-validation
  baseline for PERF-038.
- `results/perf037-{controlled,constrained}-{pilot,navigation}.json` — 60 fresh
  runs.
- `results/perf037-{analysis,visual-parity,cache-clue}.json` — derived evidence
  and the next measured clue.

### Next clue: five avoidable validation trips

Every candidate performs five zero-body `304` validations for the already-used
font, shared CSS, bootstrap, prerender controller, and manifest. The cache probe
shows `Cache-Control: public, max-age=0` on all five and 37,355 compressed bytes
avoided by successful validation, but each request still pays scheduling and
latency. This is documented Next.js behavior for mutable `public/` assets, not
a framework bug.

PERF-038 should compare this baseline with content-addressed immutable URLs,
holding CSS-first order and article delivery constant. The fixture now passes
16/16 tests and a clean Next.js 16.3.4 webpack build on Node 22.23.1.

## PERF-038: make validated shared assets genuinely fresh

PERF-038 retains CSS-first order, the 1 KiB compressed prefix, eager adaptive
150 ms promotion, and the established 500/1,000 ms intent windows. It compares
the current mutable URLs with two equal-length content-addressed namespaces:
`cache-stale` keeps `max-age=0`, while `cache-fresh` sends one-year
`immutable`. The hashed pair is the causal comparison; mutable is contextual.

The generator hashes and rewrites the shared CSS/font pair, bootstrap,
prerender controller, manifest, and both transitive manifest icons. Only the
fresh namespace receives the immutable header. Normal documents remain on the
original paths unless `perf038-cache` selects an experiment policy.

Five-run median click-to-FCP values were:

| Profile                      | Mutable | Hashed stale | Hashed immutable | Improvement |
| ---------------------------- | ------: | -----------: | ---------------: | ----------: |
| Controlled, 150 ms/1.6 Mb/s  |    99.7 |         95.7 |             31.8 | **63.9 ms** |
| Constrained, 300 ms/750 kb/s |    31.7 |         47.9 |             27.9 | **20.0 ms** |

Hashed-stale makes ten target requests and six zero-body `304` validations in
every run. Hashed-immutable makes four requests and zero validations. Both
transfer exactly 27,716 target body bytes: the win comes from removing request
latency and scheduling, not retransmitted bodies. All 30 confirmation journeys
activate; article duration/header spreads remain 3/1–2 ms.

The first result was discarded after its request inventory revealed a repeated
manifest-icon `404`: the fixture copied the production manifest but not its
transitive icons. After repairing and content-addressing the complete manifest
graph, all tests, builds, probes, visual checks, pilots, and confirmations were
rerun. The 42 pre-fix/short-intent processes remain under
`results/perf038-pre-manifest-fix-*`; the decision uses only the 36 repaired
samples. The earlier short-intent runs also record why 150 ms controlled and
500 ms constrained do not qualify: the adaptive guard cancels the incomplete
prerender and activation falls to zero.

Renderer normalization produces one SHA-256 across all policies. Both hashed
documents are 70,176 decoded bytes and 16,845 B gzip offline. Visual comparison
reports zero affected pixels and matching normalized body/head tokens for both
candidates. The direct server probe verifies seven immutable responses; an
explicit conditional request can still receive `304`, while the navigation
matrix proves that a normally fresh Chrome cache sends no validation request.

The analyzer returns
`supports-immutable-shared-assets-with-measured-fcp-win`. This does not justify
a Next.js patch: `max-age=0` is the documented safe policy for mutable
`public/` filenames. Content-addressing the complete dependency graph is the
prerequisite for immutable freshness.

Artifacts:

- `measure-cache-freshness.mjs` and `analyze-cache-freshness.mjs` — factorial,
  acceptance, and remaining-request timing.
- `probe-cache-freshness.mjs` and `verify-cache-freshness.mjs` — production
  headers plus browser semantic/visual parity.
- `results/perf038-{controlled,constrained}-{pilot,navigation}.json` — repaired
  pilots and confirmations.
- `results/perf038-{analysis,cache-policy,visual-parity}.json` — accepted result.

The remaining immutable requests are the document, article CSS, optimized
image, and measurement-only module. Every production response finishes before
FCP in all accepted runs; the measurement module can finish after FCP and is
therefore not paint-blocking. PERF-039 should use a detached Chrome
startup/Perfetto trace to attribute the remaining 28–32 ms activation/render
floor without attaching DevTools early enough to disable prerender activation.

## PERF-039: trace the activation floor and right-size the exposed avatar

PERF-039 keeps the accepted adaptive/CSS-first/immutable/1 KiB path and records
Chrome startup traces without inspecting the page target before activation. It
alternates trace-off and trace-on browsers, aligns the target frame's
`navigationStart`, `activationStart`, and `firstContentfulPaint`, and validates
every raw trace's byte length and SHA-256 before extracting work.

The fixed candidate changes one contract: the 40 px author avatar advertises
`sizes="40px"` and the corresponding Next.js small-width `srcset`. The legacy
candidate preserves the generic viewport-relative hint. Five untraced and five
traced runs per candidate/profile produced 40 accepted confirmations, all of
which activated.

| Profile/candidate  | Untraced click → FCP | Image candidate | Image body | Target body |
| ------------------ | -------------------: | --------------: | ---------: | ----------: |
| Controlled legacy  |              27.6 ms |        1,080 px |    8,539 B |    27,716 B |
| Controlled fixed   |              27.5 ms |           96 px |    1,098 B |    20,283 B |
| Constrained legacy |              27.9 ms |        1,080 px |    8,539 B |    27,716 B |
| Constrained fixed  |              31.5 ms |           96 px |    1,098 B |    20,283 B |

The exact result is 7,441 fewer image bytes (−87.1%) and 7,433 fewer total
target bytes (−26.8%); the longer small-candidate `srcset` adds 8 compressed
HTML bytes. The largest decoder task falls 5.318 → 2.570 ms controlled and
5.773 → 2.903 ms constrained. Because decoding overlaps other worker and frame
work, and untraced FCP is −0.1/+3.6 ms across the two profiles, PERF-039 claims
the byte/decode win but not an FCP win.

The phase trace explains the floor. On the fixed candidate, browser activation
commit consumes roughly 4–5 ms, the gap to the main frame roughly 4 ms, main
frame production roughly 5 ms, paint about 1.5 ms, raster 4–5 ms wall time, and
the final publication gap 4–6 ms. Style work is 0.07–0.08 ms, JavaScript is
0.26–0.28 ms, and no activation-window Layout event appears. Further network,
layout, or JavaScript micro-optimization cannot explain most of this measured
28–32 ms path.

The screenshot control preserves layout, normalized head/body, and metadata.
The intentionally different optimized avatar changes 3,332 pixels (0.2531% of
the DPR-2 viewport), with normalized RMSE 0.001679 and PSNR 55.50 dB.

The first sizes-only pilot was rejected because its inherited legacy `srcset`
could select nothing smaller than 256 px. Trace export also failed after an
otherwise valid long run. The runner now polls before closing Chrome, retries a
failed cell, checkpoints after every accepted run, validates resume
configuration, and skips completed cells. These failures are retained rather
than erased from the method.

The analyzer returns
`adopt-fixed-avatar-sizing-for-exact-byte-and-decode-work-reduction`. This is an
application bug, not a Next.js bug: the framework selected the resource the
generic `sizes` hint requested. Production now supplies the real 40 px slot.
PERF-040 should audit the same wrapper default across every fixed/responsive
call site and current Next.js 16 preload semantics.

Artifacts:

- `measure-activation-trace.mjs`, `measure-prerender-thresholds.mjs`, and
  `analyze-activation-trace.mjs` — paired capture, recovery, alignment, and
  phase/acceptance analysis.
- `lib/render-document.mjs`, the content route, and
  `public/hybrid/prerender-autorun.js` — bounded legacy/fixed candidate model.
- `verify-avatar-sizing.mjs` — semantic, layout, source-selection, and visual
  control.
- `results/perf039-{controlled,constrained}-navigation.json` and
  `results/perf039-{analysis,visual-parity}.json` — accepted evidence.
- `results/perf039-*-pilot*.json` — trace calibration and the rejected/corrected
  pilots.

## PERF-040: replace hidden image defaults with measured call-site intent

PERF-040 audits the real Next.js application rather than extending the static
prerender model. `audit-image-sizing.mjs` launches a cache-disabled isolated
Chrome context for each of three live routes at 390 × 844 and 1,440 × 1,000,
both at DPR 1 and DPR 2. It records the rendered CSS box, physical-pixel need,
selected optimizer width, encoded image body, complete `srcset`, loading hint,
preload links, initial LCP identity, and serialized post-hydration DOM bytes.

The source inventory found seven calls into the shared `components/Image.tsx`
wrapper. Three contexts are reachable from current content: the About portrait,
the default post author avatar, and MDX images. `PostBanner`, `MainCard`,
`WorkCard`, and the secondary `OptimizedImage` wrapper currently have no route
or content consumer; they are source-audited future risk, not present network
traffic. The two cards now encode their responsive one/two-column and maximum
slot geometry, while `OptimizedImage` keeps `sizes` explicit for its future
consumer instead of guessing.

The original wrapper applied one viewport-relative `sizes` value, one automatic
blur policy, and the deprecated `priority` API to unrelated image shapes.
`width` and `height` reserve aspect ratio; they do not tell the browser the CSS
slot width. Consequently the fixed 192 px About image requested 640–1,080 px
candidates, while every fixed avatar also serialized a full responsive
candidate list. Both live avatars were preloaded even though neither was the
initial LCP in any of the twelve rows.

Production now uses four explicit contracts:

- fixed images omit `sizes`, allowing Next.js's compact 1×/2× `srcset`;
- responsive MDX images model the actual 32/48 px page padding, 720 px
  intermediate content cap, and 762 px xl article column;
- the 384 px width moves into `deviceSizes`, and 192 px joins `imageSizes`, so a
  padded phone slot and the fixed About portrait have useful exact candidates;
- blur and preload are opt-in, and the wrapper's type rejects deprecated
  `priority` plus incompatible preload/loading combinations.

The wrapper also preserves static-import objects and prefixes only root-relative
string sources. Previously, calling `toString()` on a static import would have
turned a valid Next.js source object into `[object Object]`.

| Live case               | Profile     | Candidate before → after | Image bytes saved | DOM bytes saved |
| ----------------------- | ----------- | -----------------------: | ----------------: | --------------: |
| About portrait          | DPR 1       |             640 → 192 px |           7,687 B |         2,060 B |
| About portrait          | DPR 2       |       828/1,080 → 384 px |           3,979 B |         2,060 B |
| Control-plane MDX image | Mobile DPR1 |             640 → 384 px |           6,759 B |         3,553 B |
| Control-plane MDX image | Mobile DPR2 |             828 → 750 px |           1,782 B |         3,553 B |
| Load-balancer MDX image | Mobile DPR1 |             640 → 384 px |           2,649 B |         3,554 B |
| Load-balancer MDX image | Mobile DPR2 |             828 → 750 px |           1,906 B |         3,554 B |
| Both MDX images         | Desktop 1/2 |                unchanged |               0 B |  markup savings |

The post avatar keeps its already-correct 48/96 px resources, but its image
`srcset` contracts from 15 candidates/1,320 bytes to 2 candidates/168 bytes.
Removing its duplicate preload and long candidate metadata helps reduce each
measured post DOM by about 3.55 kB. These are serialized DOM bytes from a real
Next development route, not Brotli transfer bytes; the analyzer keeps that
boundary explicit.

All 20 before/after image observations preserve their rendered boxes. Every
after candidate covers the required CSS width × DPR, maximum excess falls from
3.333× to 1.26×, and desktop responsive selections stay unchanged. The audit
does not claim an LCP-time win from single development-server navigations.

### Framework finding: valid CSS syntax changes Next.js candidate count

The first corrected MDX run unexpectedly emitted 16 candidates. Next.js 16.3.4
uses `/(^|\s)(1?\d?\d)vw/g` to infer the smallest viewport percentage. It sees
`100vw`, but misses valid `calc(100vw - 2rem)`, `min(50vw, 800px)`, and decimal
`33.3vw` tokens. The browser remains correct because it receives a superset;
the defect is unnecessary HTML and candidate URLs.

The local workaround writes `calc( 100vw - 2rem)`, reducing the measured MDX
`srcset` from 16 candidates/1,440 bytes to 9 candidates/818 bytes. The separate
`experiments/next-image-sizes-parser` reproduction pins this behavior on
Next.js 16.3.4. Its proposed upstream patch broadens CSS token boundaries,
supports decimals with `parseFloat`, and adds cases to Next.js's existing
`next-image-get-img-props` unit suite. Installed dependencies are not patched.

The analyzer returns
`adopt-explicit-image-intent-and-prepare-nextjs-vw-parser-patch`. The next
experiment should address the new scheduling clue: the first MDX image is the
desktop LCP but text wins on mobile. PERF-041 should compare lazy, eager, and
high-priority discovery without forcing below-fold mobile images into the
critical queue.

Validation completed all 12 baseline and 12 after browser rows, passed the
15/15 focused application suite and 18/18 static-tier suite, and passed ESLint
for every changed TSX path. The final Next production webpack phase compiled in 11.5
seconds before the repository-wide TypeScript phase reached 17 pre-existing
intentional-error examples under `experiments/rust-atlas/types-under-the-hood`;
none are attributed to the PERF-040 image paths.

Artifacts:

- `audit-image-sizing.mjs` and `analyze-image-sizing.mjs` — real-route matrix,
  invariants, exact comparisons, and decision.
- `results/perf040-{before,after}-image-audit.json` and
  `results/perf040-analysis.json` — raw and derived evidence.
- `../next-image-sizes-parser/reproduce.mjs`, `README.md`,
  `next-upstream.patch`, and `results/next-16.3.4.json` — framework
  reproduction and upstream-ready proposal.

## PERF-041: high priority without eager MDX loading

PERF-041 separates image eligibility from network ranking. A build-time remark
plugin marks only the first MDX content image with `loading="lazy"` and
`fetchPriority="high"`. The browser still decides when proximity makes the
image eligible; later content images retain lazy loading and automatic
priority. This replaces neither policy with `eager` and adds no client-side
observer or hydration boundary.

The controlled real-route matrix retained five repetitions across two current
image-bearing articles and mobile/desktop viewports: 20 baseline plus 20 after
navigations. Every target request changed from Low to High initial network
priority while geometry, LCP identity, and zero-preload behavior stayed fixed.
The two desktop image-LCP medians improved by 768 ms and 980 ms. Mobile stayed
text-LCP, so its small timing movement is not claimed as an improvement.

A separate adversarial browser proof held a lazy/high image more than 4,000 px
below the viewport with zero request, then observed a High-priority request only
after approach. A later lazy/automatic image stayed unfetched. The accepted
decision is `adopt-native-lazy-first-image-priority`; raw evidence and analysis
live in `../mdx-image-priority/results`.

## PERF-042: media-gated exact responsive preload

PERF-042 measures the upper bound left by PERF-041. The two diagrams are proven
inside the 1,440 × 1,000 initial viewport and become desktop image LCPs, so an
explicit source allowlist emits the exact Next.js `srcset`/`sizes` through
React's `preload()` with
`media="(min-width: 1280px) and (min-height: 640px)"`. Their `<img>` elements
remain `loading="lazy" fetchpriority="high"`; all other MDX images remain
native-lazy and receive no preload.

Five repetitions per route/profile show desktop discovery moving 776/790 ms
earlier and desktop LCP moving 924/532 ms earlier than the PERF-041 baseline.
All 20 candidate rows use one target request. Matching desktop resources are
link-initiated; mismatching mobile resources remain img-initiated and keep
their text-LCP identities. Geometry, selected candidates, image bytes, exact
responsive strings, and accessibility names remain fixed.

The full responsive hint adds 2,404/2,385 raw development-response bytes. An
adversarial far-image proof shows why the allowlist is mandatory: a media
mismatch preserves zero requests until approach, while a match bypasses lazy
eligibility even 4,000 px below the viewport. Explicit-JSX dimension loss and a
duplicate literal-link implementation were both rejected and documented.

The independent `../next-image-preload-media` reproduction shows that Next.js
16.3.4 still lacks this API, leaks attempted `preloadMedia` to `<img>`, and
rejects the required lazy fallback. Its upstream-ready patch adds the scoped
preload path plus four tests and applies cleanly to fetched current-canary
source. The accepted application decision is
`adopt-opt-in-media-gated-responsive-preload`; raw evidence lives in
`../mdx-media-preload/results`.

### PERF-043 production preload-metadata audit

PERF-043 tests whether PERF-042's nine repeated responsive candidates are a
real transfer problem after production compression. Four fixed-build-ID
artifact builds compare no preload, the exact full hint, a two-candidate DPR
1/2 hint, and a six-candidate desktop-DPR-at-least-one hint. Three production
browser matrices add 84 fresh-context navigations across DPR 0.8, 1, 1.25,
1.5, 2, and 3.

The full hint costs only 250/344 gzip bytes or 116/126 Brotli bytes above no
preload in the two documents. The two-candidate form duplicates downloads in
seven boundary rows and adds 500–812 ms to their LCP. The safe six-candidate
form preserves one request but makes the complete document 3–15 gzip bytes and
5–44 Brotli bytes larger: removing repeated strings weakens compression while
adding a unique resolution gate. The accepted decision is
`retain-full-exact-responsive-preload`; production code remains unchanged and
the temporary build harness is retained only as `variant-harness.patch`.
