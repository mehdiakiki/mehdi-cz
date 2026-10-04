# Next content-delivery floor

This fixture asks an architectural question with the real production-rendered
homepage and a real long article instead of a hello-world page:

1. What does the current interactive App Router site cost?
2. What remains when the same first-render DOM is emitted by Server Components
   with no Client Components?
3. What remains when the same snapshot is returned as plain HTML with no React
   hydration or Flight payload?

The experiment copies the exact built CSS, required fonts, required local
images, metadata, structured data, and visible HTML from the production build.
It deliberately removes executable scripts before replaying the snapshot. The
server-only and plain variants therefore preserve the initial visual and
semantic document, but their search, menu, theme, comment, scroll, and
intent-prefetch controls are inert. Normal links still work as links.

This is a lower-bound experiment, not a proposed blind rewrite. It quantifies
the price of the framework/runtime and the interaction contract separately so
that a later hybrid design can spend JavaScript only on interactions shown to
justify it.

## Result

The complete deterministic result is in `results/artifact-measurement.json`.
The compressed initial-transfer model is document + blocking CSS + modern
startup JavaScript; it excludes images, fonts, and response headers.

| Page    | Current App Router | Server-only App Router | Plain HTML |
| ------- | -----------------: | ---------------------: | ---------: |
| Home    |          170,777 B |              156,078 B |   20,615 B |
| Article |          196,580 B |              171,333 B |   29,124 B |

Server-only rendering removed application Client Components but retained four
Next/React startup chunks. It saved 8.61% gzip on the homepage and 12.84% on the
article. The full host tree also became Flight data, so its HTML and RSC payload
grew; moving a boundary to the server was not automatically a byte win.

Plain HTML removed 87.93% gzip on the homepage and 85.18% on the article. Its
complete compressed document was also smaller than the current route's RSC
navigation payload alone: 5,676 versus 6,456 bytes for home and 9,222 versus
9,958 bytes for the article. That is a payload clue, not a claim that full-page
navigations are universally better: browser state, cached layouts, client
transitions, request headers, and interaction behavior differ.

Five cold mobile traces per case are derived in
`results/browser-measurement.json`:

| Page / variant      | Median LCP | Median DOMContentLoaded | Median load | CLS |
| ------------------- | ---------: | ----------------------: | ----------: | --: |
| Home current        |   515.3 ms |                458.7 ms |    740.8 ms |   0 |
| Home server-only    |   515.5 ms |                452.4 ms |    679.0 ms |   0 |
| Home plain HTML     |   496.0 ms |                204.7 ms |    403.2 ms |   0 |
| Article current     |   574.8 ms |                473.1 ms |    878.6 ms |   0 |
| Article server-only |   564.3 ms |                454.7 ms |    745.2 ms |   0 |
| Article plain HTML  |   558.1 ms |                209.7 ms |    424.5 ms |   0 |

The LCP element was server-rendered text and FCP equaled LCP in every selected
run. Plain HTML consistently improved the local median by 19.3 ms on home and
16.7 ms on the article, but its much larger effect was after the first paint:
DOMContentLoaded fell about 55% and load fell 46–52%. These localhost samples
are diagnostic evidence, not field Core Web Vitals or visitor-growth evidence.
Once JavaScript disappears, blocking CSS is 72.5% of the homepage model and
68.3% of the article model. Critical-CSS/font discovery is therefore the next
measured cold-LCP clue; selective enhancement is the separate route to the much
larger transfer and completion-time saving.

The loaded homepage viewport was pixel-identical in all three variants. On the
article, server-only and plain HTML were identical; 0.371% of pixels differed
from the hydrated page, all inside the avatar region. The current page removes
Next/Image's inline blur background after decode; a non-hydrated snapshot
retains it. The loaded image bytes were identical. A real no-hydration tier
must replace this hydration-dependent cleanup rather than copying the SSR
attribute blindly.

## Next.js compression control

Unmodified Next.js 16.3.4 compressed the large Page response but sent both
large Route Handler responses as identity. This reproduces Next.js issue
[#98007](https://github.com/vercel/next.js/issues/98007). Applying existing PR
[#98044](https://github.com/vercel/next.js/pull/98044) to a temporary dependency
copy and rebuilding into `.next-patched` reduced the 8,800-byte route control
to 81 encoded bytes and the 21,264-byte homepage to 5,685 bytes while
preserving the custom `Vary` token. No dependency edit is retained. The fair
plain-HTML browser runs use that patched build so Route Handler compression is
comparable with the Page variants.

## Run

From the repository root, first produce the current production build. Build the
fixture and measure its artifacts before starting the server:

```bash
cd experiments/next-content-delivery-floor
npm run build
npm run measure
npm run start
```

With that server still running, use another terminal for the response control:

```bash
cd experiments/next-content-delivery-floor
npm run check:compression -- http://localhost:3117
```

After capturing traces and screenshots, derive their compact results with:

```bash
npm run measure:browser -- /path/to/traces
npm run measure:visual -- /path/to/screenshots
```

The fixture listens on port 3117. Its measured pages are:

- `/server/home`
- `/server/article`
- `/plain/home`
- `/plain/article`

Generated snapshots and copied production assets are ignored. This prevents a
stale snapshot from becoming evidence after the real site changes.

The `/compression/page` and `/compression/route` controls each exceed Next's
compression threshold. `check-compression.mjs` shows whether a running version
of `next start` compresses both response paths and also checks the real plain
homepage. This isolates a Route Handler compression failure from the larger
architecture experiment.

`analyze-traces.mjs` expects five cold traces for every case, using the stems
documented in `results/browser-measurement.json`. It derives FCP, LCP,
DOMContentLoaded, load, and CLS directly from trace events. Raw Chrome traces
are intentionally not committed; the compact derived result is. Timing results
are local diagnostic evidence, not field Core Web Vitals.

`compare-screenshots.mjs` uses ImageMagick's `identify` and `compare` commands.
Capture loaded light-mode mobile viewports with the filenames described in
`results/visual-parity.json`. The compact comparison is committed; screenshots
are not. This test covers one viewport and cannot replace responsive and
interactive behavior checks.
