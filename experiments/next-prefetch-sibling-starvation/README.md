# PERF-046/047: Next.js sibling-prefetch protocol and scheduler starvation

PERF-045 observed 11 idle RSC requests for seven visible dynamic tag links. That shape looked suspicious: four small responses, seven larger responses, and one shared JavaScript chunk. PERF-046 asks two separate questions instead of treating every request as waste:

1. What does each RSC request mean in the Next.js 16 protocol?
2. Can the segment-cache scheduler fail to prepare a sibling when several prefetches are committed together?

The answer to the first question is benign. The four small responses are route-tree discovery, and the seven larger responses are one page segment per destination. The answer to the second question is a reproducible Next.js defect when Cache Components and partial prefetching are enabled. The defect survives current stable, current canary, webpack, and Turbopack. The behavior implemented by open PR [vercel/next.js#97377](https://github.com/vercel/next.js/pull/97377) fixes the structural task loss in this fixture.

This experiment does **not** show a reliable click-latency improvement from the patch. Latest Next.js partial-prefetch semantics reuse one App Shell per route, and explicit URL-specific full prefetch still covered every destination in the minimized route. The contribution-grade finding is scheduler correctness, not an invented millisecond win.

## Runtime and controls

- Next.js stable: 16.3.4.
- Next.js canary: 16.4.0-canary.26, with matching `@next/env` and native SWC package.
- React / React DOM: 19.2.8.
- Node.js for builds and measurements: 24.20.0.
- Chrome: 145.0.7632.159.
- Puppeteer Core: 25.10.0.
- Bundlers: webpack and Turbopack.
- Cache modes: legacy route prefetching, then `cacheComponents: true` plus `partialPrefetching: true`.
- Browser state: a new isolated browser context per run, with both browser cache and CDP cache disabled.
- Timing profile: localhost, plus a controlled profile with 150 ms latency, 200,000 B/s download, and 93,750 B/s upload.
- Repetitions: three per matrix cell, with order reversed on alternating repetitions.

The 14 retained measurement datasets contain 222 isolated navigations and zero page-error runs. The independent Chrome DevTools trace is a separate protocol/health check and is not folded into timing medians.

The partial route deliberately mirrors the shape at issue: seven generated dynamic slugs, a static parameter boundary, and a `connection()` hole under Suspense. The large static route gives every destination a unique, easily attributable response. Disabled-prefetch rows must issue zero requests.

## The request protocol, not just the waterfall shape

The harness records request and response headers, response bytes and hashes, start/end time, failure state, and the phase that initiated the request. In particular, it captures:

- `Next-Router-Prefetch`;
- `Next-Router-Segment-Prefetch`;
- `Next-Router-State-Tree`;
- `Next-Url`.

On an ordinary static dynamic-segment route, automatic prefetch produces this stable pattern in all three webpack and all three Turbopack repetitions:

| Visible siblings | `/_tree` responses | Page-segment responses | Total RSC requests |
| ---------------: | -----------------: | ---------------------: | -----------------: |
|                1 |                  1 |                      1 |                  2 |
|                4 |                  4 |                      4 |                  8 |
|                5 |                  4 |                      5 |                  9 |
|                7 |                  4 |                      7 |                 11 |

The small response carries `Next-Router-Segment-Prefetch: /_tree`. The large response carries `Next-Router-Segment-Prefetch: /static/$d$slug/__PAGE__`. An independent DevTools recording saw the same four-plus-seven split, LCP 46 ms and CLS 0 on the tiny unthrottled fixture, with no console messages. Those Core Web Vital values only prove that the fixture loaded cleanly; they say nothing about production performance.

The important correction is therefore:

> Four small plus seven large responses are not eleven duplicate route payloads. They are a four-request route-discovery wave and seven destination-specific page segments.

`prefetch={false}` produces zero requests. `prefetch={true}` asks for URL-specific/full preparation and uses navigation-shaped responses that do not carry the segment-prefetch header, so the analyzer records those separately rather than mislabeling them as ordinary navigation.

## The scheduler boundary

With Cache Components enabled, the documented default is different: Next.js can fetch and reuse one App Shell for the route rather than fetch a complete payload for each URL. Four synchronous `router.prefetch()` calls behave as expected: four trees and one shared shell segment. At five calls the scheduler remains stuck at four trees and one segment. At seven calls it still produces only four trees and one segment.

| Same-tick default calls | Stable/canary trees | Shared segments | Destinations with no request | Explicit retry of first missing URL |
| ----------------------: | ------------------: | --------------: | ---------------------------: | ----------------------------------: |
|                       4 |                   4 |               1 |                            0 |                          0 requests |
|                       5 |                   4 |               1 |                            1 |                          0 requests |
|                       7 |                   4 |               1 |                            3 |                          0 requests |

For five calls, `/partial/alpha` has no request. For seven, `/partial/alpha`, `/partial/bravo`, and `/partial/charlie` have no request. Calling `router.prefetch()` again for the first missing URL after the network becomes idle is a no-op, and clicking it requires a navigation request. Every row still renders the correct slug and dynamic content.

This exact 4→5 boundary reproduces in:

- Next.js 16.3.4 with webpack, 3/3 repetitions;
- Next.js 16.3.4 with Turbopack, 3/3;
- Next.js 16.4.0-canary.26 with webpack, 3/3;
- Next.js 16.4.0-canary.26 with Turbopack, 3/3.

Staggering the calls by 75 ms is not counted as the same failure. Under the documented reusable-App-Shell model, later default prefetches can legitimately reuse the first route shell. The falsifiable failure definition is deliberately stricter: a same-tick committed destination had no request, a later explicit retry was a no-op, and click required network.

## Why PR #97377 changes the result

The failure is caused by when a task decides that its route-cache entry exists. Several sibling tasks are committed while their URLs are cache misses. While they wait behind the scheduler's four-task concurrency boundary, an earlier sibling can populate a predicted/shared entry. A queued task then observes that newer cache state and can be treated as already satisfied even though its own route-tree request never ran.

PR #97377 snapshots whether the route cache was missing when each task was scheduled. When a task that began as a miss finally executes, it does not let a sibling-created predicted entry erase that commitment.

`scripts/apply-pr-97377-dist.mjs` is a narrow adapter of that source change to the installed package's CommonJS and ESM build artifacts. It exists only so the proposal can be tested against the exact published runtime; it is not a production patch and must only be applied to an isolated fixture dependency.

After applying that behavior:

| Same-tick default calls | Patched trees | Shared segments | Missing destinations |      Retry |
| ----------------------: | ------------: | --------------: | -------------------: | ---------: |
|                       4 |             4 |               1 |                    0 | 0 requests |
|                       5 |             5 |               1 |                    0 | 0 requests |
|                       7 |             7 |               1 |                    0 | 0 requests |

The result passes 3/3 repetitions on both webpack and Turbopack. The viewport-full and static-auto controls also recover the fifth tree. This independently validates the patch's scheduler invariant against a published Next.js build.

## Why this is not yet a speed claim

Two additional matrices tried to turn the structural fix into a user-facing latency result.

First, the default App Shell path was measured at the controlled network profile:

| Siblings | Stable click median | Patched click median | Patched − stable |
| -------: | ------------------: | -------------------: | ---------------: |
|        4 |          185.434 ms |           197.248 ms |       +11.814 ms |
|        5 |          182.556 ms |           194.143 ms |       +11.587 ms |
|        7 |          183.186 ms |           199.323 ms |       +16.137 ms |

All three patched medians are slower in this three-sample fixture. More importantly, both the four-link control and affected rows require one click-time request for the intentional `connection()` hole, so these medians do not isolate scheduler task loss.

Second, `router.prefetch(href, { kind: "full" })` tested URL-specific preparation:

| Siblings | Stable click median | Patched click median | Patched − stable |
| -------: | ------------------: | -------------------: | ---------------: |
|        4 |           33.271 ms |            35.853 ms |        +2.582 ms |
|        5 |           36.752 ms |            30.377 ms |        −6.375 ms |
|        7 |           32.609 ms |            27.296 ms |        −5.313 ms |

The direction changes at the boundary and the sample is small. Stable has only four explicit tree responses at five and seven links, but it still sends a URL-specific request for every destination: one shared segment plus `N − 1` full route payloads. Some of those streams end with `net::ERR_ABORTED` after Next.js has retained their static prefix because the `connection()` hole is intentionally not prefetchable. That is not a page error.

This falsifies the stronger local hypothesis. The patch prevents scheduled tasks from being forgotten, but this minimized route does not show URL-specific full-prefetch starvation or a reliable click-to-content improvement. A real latency claim needs a route whose missing committed task also withholds useful URL-specific content, more repetitions, and field validation.

## Failed and corrected experimental paths

The failures are retained because each changed the method:

1. The first Cache Components build read `searchParams` in the server page without a compatible Suspense/static boundary. The build correctly failed. Query parsing moved into the client harness; the route under test remained the generated destination, not the controller page.
2. The first “same tick” trigger used `setTimeout(..., 0)` for every sibling. That delegates batching to browser task scheduling and does not prove synchronous commitment. Zero-delay mode now invokes every `router.prefetch()` directly in one event handler.
3. The first canary webpack build mixed the canary JavaScript package with the stable native SWC package. Its result was rejected and rebuilt with matching `next`, `@next/env`, and `@next/swc-linux-x64-gnu` versions.
4. The first canary Turbopack builds used dependency symlinks outside the configured fixture root and failed resolution. Physical copies inside the ignored fixture `node_modules` directory passed. This was test-environment topology, not product behavior.
5. Counting URLs alone initially made navigation-shaped full-prefetch responses ambiguous. The final classifier combines phase and Next.js protocol headers, and full-prefetch starvation is tested separately from default App Shell reuse.

## Decision

- Keep the site's existing intent-only tag-link policy from PERF-045. It already removes all idle tag work and does not depend on experimental Cache Components behavior.
- Do not add a site-local scheduler workaround or ship a patched Next.js package.
- Treat the fixture as independent validation for [issue #96965](https://github.com/vercel/next.js/issues/96965) and [PR #97377](https://github.com/vercel/next.js/pull/97377).
- Keep “patch fixes task commitment” and “patch makes this site faster” as separate claims. Only the first is proven here.
- Prepare the evidence for upstream review, but do not post externally without explicit authorization.

## Reproduction

Use Node.js 24.20.0 or later before installing or running the fixture:

```bash
cd experiments/next-prefetch-sibling-starvation
npm install
npm run verify
```

Build and serve the legacy webpack control:

```bash
PERF046_CACHE_MODE=legacy NEXT_DIST_DIR=.next-stable-legacy-webpack npm run build:webpack
PERF046_CACHE_MODE=legacy NEXT_DIST_DIR=.next-stable-legacy-webpack npm start -- --port 3146
```

Measure it from another terminal:

```bash
PERF046_CACHE_MODE=legacy \
PERF046_BUNDLER=webpack \
PERF046_LABEL=stable-legacy-webpack \
NEXT_DIST_DIR=.next-stable-legacy-webpack \
npm run measure
```

For the affected stable configuration, use `PERF046_CACHE_MODE=partial` for build, start, and measurement. Use `PERF046_FOCUS=auto-boundary` to run only the default 4/5/7 scheduler boundary, `PERF046_FOCUS=full-boundary` for explicit full prefetch, and `PERF046_PROFILE=controlled` for the shaped transport.

Run `npm run analyze` with no arguments to regenerate the combined report from all measurement JSON files in `results/`. Apply the PR adapter only to `node_modules/next` inside a disposable copy of this fixture:

```bash
node scripts/apply-pr-97377-dist.mjs node_modules/next
```

Never point the adapter at the repository's primary dependency tree.

## Artifacts

- `scripts/protocol.mjs` — protocol-aware classification and path accounting.
- `scripts/measure.mjs` — fresh-context matrix, headers, bodies, retries, and committed navigation.
- `scripts/analyze.mjs` and `scripts/analyze.test.mjs` — gates for attribution, starvation, patch validation, and timing non-claim.
- `scripts/apply-pr-97377-dist.mjs` — isolated compiled-runtime adaptation of the open PR.
- `results/stable-legacy-{webpack,turbopack}.json` — protocol controls.
- `results/{stable,canary,patched-pr97377}-partial-{webpack,turbopack}.json` — cross-version/cross-bundler scheduler matrix.
- `results/{stable,patched-pr97377}-{auto,full}-webpack-controlled.json` — focused latency falsification.
- `results/perf046-analysis.json` — combined 222-run analysis.
- `results/perf046-devtools.json` — independent DevTools trace summary.

## Article lesson

A waterfall shape is not an explanation. Read the protocol before deleting requests. Here that prevented a false duplicate-payload claim, exposed a different four-task scheduler boundary, validated an active framework patch, and then stopped short of claiming speed when the route's current App Shell semantics did not produce it. The failed latency hypothesis is part of the result, not something to hide.

## PERF-047: validate the real source patch, not only a compiled adapter

PERF-046 adapted PR #97377 to an isolated published package. PERF-047 closes the evidentiary gap: the exact upstream fixture and source diff were tested in an isolated checkout of the official Next.js repository. No file in this site's runtime dependency tree was patched.

The checkout started at the PR's exact base commit, `a02b83fd53a66548520a5dff4ac61a0e18b83733`. The PR head is `cc4db25817ff35fe2cf473424f4dbb8c4a2c1fc2`. Comparing the eight-file working diff with the upstream base-to-head diff produced the same SHA-256, `104ceb3a81efbb720495cd859bc6912d6d6bb433308e2c6e7a82bf36d934060d`: 194 additions and 6 deletions across two source files and six fixture/test files.

### The minimal upstream red/green result

The fixture enables Cache Components and partial prefetching, builds five generated product siblings, and synchronously calls `router.prefetch()` for alpha through echo. It listens only for requests whose `Next-Router-Segment-Prefetch` header is `/_tree`. This directly tests the task commitment; it does not infer behavior from a total request count.

| Bundler   | Exact PR base      | Route trees observed before | Exact PR patch | Focused assertion |
| :-------- | :----------------- | :-------------------------- | :------------- | ----------------: |
| webpack   | failed as expected | bravo, charlie, delta, echo | passed         |            906 ms |
| Turbopack | failed as expected | bravo, charlie, delta, echo | passed         |            834 ms |

Both unpatched engines omit alpha after the test's retry window: the fifth task is the one waiting beyond the four-request concurrency boundary. Both patched engines observe alpha through echo. This independently reproduces PERF-046's browser finding in the framework's own E2E harness and shows that the source patch fixes both bundlers.

The 20.245/12.064-second red suite durations and 22.816/8.331-second green suite durations are recorded for reproducibility, not compared as site performance. They include isolated package creation, application compilation, server startup, browser startup, and cache state. The conclusion is scheduler correctness only; PERF-046 already rejected a generalized click-speed claim for its minimized App Shell route.

### What the patch changes in simple terms

Before the change, five callers could all say “please prepare my route,” but the fifth waited. One of the first four then taught the cache the general route shape. When the fifth task resumed, it saw that prediction and incorrectly treated it as if its own work had been completed.

The patch adds one boolean to each scheduled task: was this exact URL absent when the caller committed the task? If yes, the later cache lookup may accept a concrete entry for that URL, but it may not accept a sibling-derived prediction as a substitute. Rescheduling recomputes the boolean because it is a new scheduling decision. No concurrency limit is raised and no global cache reuse is disabled.

That narrow invariant matters. Increasing concurrency would merely move the failure boundary. Disabling predictions would discard useful shared work. Remembering the original commitment preserves both bounded concurrency and legitimate cache reuse.

### Source-checkout validation

- The repository's required `pnpm build-all` bootstrap passed 18/18 tasks at the base commit in 45.565 seconds.
- After applying the exact PR diff, the `next` package rebuilt successfully in 27.27 seconds, including declaration generation.
- The focused E2E test passed under webpack and Turbopack.
- All eight changed files passed targeted Prettier and ESLint checks.
- The JSON evidence contract passes with `node scripts/verify-perf047-source.mjs`.

### Failed setup paths retained as evidence

Three setup failures are excluded from product evidence but kept because they make the reproduction more useful:

1. The installed Corepack had stale signing keys and could not verify the repository-pinned pnpm release. Signature verification was not disabled; the exact pinned pnpm 10.33.0 was run through npm instead.
2. The Next.js E2E harness intentionally removes every `node_modules/.bin` segment from the child `PATH`. That also removed npm-exec's pnpm executable, so the test application never started and cleanup reported a missing pid. A temporary path exposed only the pinned pnpm executable outside the filtered segment.
3. The next attempt reached the browser launch but lacked Playwright's exact Chromium revision. Chromium 1228 (Chrome for Testing 149.0.7827.55) was installed, after which the unchanged test produced the valid red result.

These are harness/toolchain failures, not flaky product failures. The accepted matrix begins only once the exact application built, the browser launched, and the assertion inspected the five route-tree paths.

### Contribution decision

PR #97377 is already open, so opening a duplicate patch would add noise. PERF-047 instead produces a review-ready independent validation note: exact commits, exact diff identity, red/green results for both bundlers, build/lint/format status, and an explicit latency non-claim. Nothing was posted or changed externally.

The durable evidence is `results/perf047-source-validation.json`; its executable contract is `scripts/verify-perf047-source.mjs`. The disposable source checkout and its large generated build outputs are intentionally not part of this repository.
