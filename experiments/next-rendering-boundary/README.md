# Next.js rendering-boundary reproduction

This fixture compares four ways to deliver the same deterministic 360-record archive on Next.js 16.3.4:

1. a pure Server Component tree;
2. a Client Component receiving the archive through server props;
3. a client-rendered archive fetched as JSON after hydration;
4. a plain HTML Route Handler without React hydration.

The experiment does not assume that one architecture is universally fastest. It measures document, inline Flight, compressed transfer, JavaScript/network, parsing, rendering, content timing, crawlability, and interactivity separately.

## Run

```bash
npm install
npm run build
PORT=3116 npm run start
npm run measure
```

The content markers make representation duplication countable. The client-fetch case adds an `archive-content-painted` performance mark after its records have rendered. Browser traces must use the same viewport, network, CPU, and cache state for every route.

For controlled cold-document traces, navigate to each route with a unique `?run=<id>` query while recording instead of recording a reload. The client-fetch route propagates that identifier to an explicitly uncached JSON request so a previous trace cannot reuse the archive response.

This is an isolated framework reproduction. It is not part of the production application or its dependency graph.

## Why this comparison matters

“Server” and “client” are not single performance modes in the App Router. A Client Component can still be rendered into the initial HTML on the server and then hydrate from serialized props; a different Client Component can render only a shell and fetch its useful content later. Those two cases have different transfer, rendering, crawlability, and JavaScript costs. This experiment therefore treats the rendering boundary as a variable to measure, not a rule whose winner is known in advance.

The result is intentionally shape-specific. The archive repeats the same component structure around 360 records, which makes the cost of serializing an expanded React element tree visible. It does not establish that Client Components are generally faster than Server Components.

## Deterministic build-artifact results

`npm run measure:builds` reads separately generated Turbopack and webpack production artifacts. It measures the document, standalone RSC payload, decoded inline Flight stream, repeated record markers, referenced route assets, and local gzip/Brotli representations without involving a server or cache.

The primary Next.js 16.3.4 Turbopack artifacts were:

| Route                           | Raw document |     Gzip |   Brotli | Decoded inline Flight | Flight share | Record markers | Articles in initial HTML |
| ------------------------------- | -----------: | -------: | -------: | --------------------: | -----------: | -------------: | -----------------------: |
| Pure Server Component           |    688,863 B | 28,804 B | 14,619 B |             361,245 B |        52.4% |            720 |                      360 |
| Client Component + server props |    584,700 B | 23,646 B | 11,491 B |             273,377 B |        46.8% |            720 |                      360 |
| Client fetch after hydration    |      6,493 B |  1,945 B |  1,590 B |               4,409 B |        67.9% |              0 |                        0 |
| Plain HTML Route Handler        |    298,927 B | 12,083 B |  6,609 B |                   0 B |           0% |            360 |                      360 |
| JSON records response           |    268,921 B | 10,050 B |  5,465 B |                   0 B |           0% |            360 |                        0 |

Each record marker occurs once in the rendered HTML and once in Flight for both React routes. The equality between the decoded inline stream and the standalone `.rsc` artifact provides a second check on the decoder. Relative to the pure Server Component route, the client-prop route reduced the initial document by 104,163 raw bytes (15.1%), 5,158 gzip bytes (17.9%), and 3,128 Brotli bytes (21.4%). Its referenced build assets added only 378 gzip bytes in this fixture. The compact record objects plus one client rendering algorithm were cheaper than serializing the expanded server element tree into Flight.

Plain HTML was smaller still: compared with the Server Component document it removed 389,936 raw bytes (56.6%), 16,721 gzip bytes (58.1%), and 8,010 Brotli bytes (54.8%). That is an architectural ceiling, not a free Next.js optimization: the Route Handler opts out of React hydration and the App Router client runtime and manually owns the complete document, metadata, and CSS.

### Bundler control

The same source was built once with Turbopack and once with webpack:

| Route              | Turbopack raw / gzip / Brotli | webpack raw / gzip / Brotli | Turbopack minus webpack |
| ------------------ | ----------------------------: | --------------------------: | ----------------------: |
| Server Component   |   688,863 / 28,804 / 14,619 B | 688,232 / 28,661 / 14,635 B |     +631 / +143 / −16 B |
| Client props       |   584,700 / 23,646 / 11,491 B | 583,974 / 23,513 / 11,556 B |     +726 / +133 / −65 B |
| Client fetch shell |       6,493 / 1,945 / 1,590 B |     5,794 / 1,934 / 1,574 B |      +699 / +11 / +16 B |

The content/Flight duplication and the client-prop advantage survived both bundlers with materially the same size. This rules out a Turbopack-only explanation. Using the issue-compatible metric, including quoted relative asset paths, Turbopack emitted 393 bytes of Flight asset URLs on the server route and 510 bytes on the client-prop route, versus 137 bytes for the webpack client-prop route. That is only 0.11–0.19% of these Flight payloads, so this fixture does not reproduce the large impact reported in Next.js issue [#95559](https://github.com/vercel/next.js/issues/95559). It remains a useful narrower issue, but it is not the cause of this archive's cost.

## Controlled browser result

Five accepted runs per route used Chromium at 390 × 844, Fast 4G, and 4× CPU slowdown. Every navigation used a unique query so the document was cold; immutable framework assets were already warm. Values below are medians. CLS was 0 in every accepted trace.

| Delivery contract               |    LCP | DOMContentLoaded |     Load |              Useful-content boundary | Initial articles |
| ------------------------------- | -----: | ---------------: | -------: | -----------------------------------: | ---------------: |
| Server Component                | 500 ms |         539.5 ms | 540.0 ms |              present in initial HTML |              360 |
| Client Component + server props | 484 ms |         509.1 ms | 510.2 ms |              present in initial HTML |              360 |
| Client fetch after hydration    | 944 ms |         239.2 ms | 240.4 ms |    947.2 ms after paint confirmation |                0 |
| Plain HTML Route Handler        | 244 ms |         504.5 ms | 506.4 ms | progressively present during parsing |              360 |

For this fixture, the client-prop boundary was 16 ms (3.2%) faster at median LCP and 30.4 ms (5.6%) faster at DOMContentLoaded than the pure Server Component boundary. Those small lab directions agree with the byte reduction but are not field claims or a universal prescription.

The client-fetch shell looked dramatically faster only until the records were included in the definition of “done.” Its 239.2 ms DOMContentLoaded described an empty shell; the median final-content paint was 947.2 ms and LCP was 944 ms, 88.8% later than the Server Component LCP. The 360th record reached the DOM at 739.5 ms. The route also began with no crawlable archive content and added a second dependency.

The local `next start` server compressed ordinary Next-generated documents but did not apply content encoding to the custom HTML and JSON `Response` bodies. Consequently the browser transferred 298,927 bytes for the plain document and 268,921 bytes for the JSON response, even though their deterministic gzip sizes were 12,083 and 10,050 bytes. Production compression or CDN behavior must be verified independently; the theoretical compressed figures are not substituted for the observed local network transfers.

## Rejected and revised measurements

- The first browser harness stopped when the DOM appeared stable. It accepted the client-fetch shell around 248 ms with zero articles and produced a false “win.” The acceptance condition was changed to require record 360 and an `archive-content-painted` mark emitted after two animation frames.
- Reload-based traces produced HTTP 304 responses and reused the JSON archive. They were replaced with manual trace start, unique-query navigation, and `cache: "no-store"` on the JSON boundary.
- The first webpack build inherited the parent repository's Tailwind/PostCSS configuration. A fixture-local empty PostCSS configuration isolated both builds before comparison.
- The first localhost artifact fetch was blocked by the execution sandbox. The identical command succeeded with approved local-network access; this was an environment failure, not a framework result.

## Interpretation and framework boundary

The general initial HTML/Flight repetition is real in Next.js 16.3.4, but this reproduction alone is not a new framework bug. Next needs the initial RSC stream for hydration and App Router state; a Next.js maintainer describes that current constraint in [discussion #42170](https://github.com/vercel/next.js/discussions/42170#discussioncomment-8880248). A later report specifically about server-only content duplication, [issue #82872](https://github.com/vercel/next.js/issues/82872), is already closed. The experiment therefore preserves the reproduction and its cost without claiming that simply deleting inline Flight is a valid patch.

The actionable local lesson is more interesting than “SSR wins” or “CSR wins”: choose boundaries according to the shape and the user-visible completion criterion. Server Components retain crawlable initial content and avoid application hydration code. A small Client Component can sometimes provide a more compact serialization grammar for highly repeated content. Client fetching can minimize the shell while making useful content much later. Plain HTML shows the lower-bound cost when React navigation and interactivity are unnecessary.
