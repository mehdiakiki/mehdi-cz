# PERF-041 — viewport-gated MDX image priority

This experiment compares the existing lazy/automatic priority policy with a
native gated policy for the first content image in each MDX document:

```html
<img loading="lazy" fetchpriority="high" />
```

`loading="lazy"` remains the eligibility gate. The browser does not fetch a far
offscreen image merely because its eventual fetch priority is high. When layout
places the image in or within the browser's calculated distance from the
viewport, the request can start at high priority. Only the first content image
is annotated; subsequent MDX images keep lazy loading and automatic priority.

The implementation is intentionally build-time and browser-native. It does not
ship an IntersectionObserver or a React client boundary merely to reproduce
native image scheduling.

Run against the real application on port 3121:

```sh
PERF041_PHASE=baseline node measure.mjs
PERF041_PHASE=native-gated node measure.mjs
node analyze.mjs
```

The harness uses isolated cache-disabled contexts, controlled transport, no
scrolling, two live image-bearing articles, and mobile/desktop viewports. It
captures actual geometry, lazy/fetch-priority attributes, CDP request priority,
resource timing, and final LCP identity.

## Accepted result

Across 20 matched runs per phase, the target image remains `loading="lazy"`
while its CDP initial priority changes from Low to High in every comparison.
The desktop diagrams remain LCP and improve by median 768 ms and 980 ms under
the controlled transport. Mobile remains text-LCP, so its ±16 ms LCP movement
is not treated as a win.

`verify-native-gate.mjs` supplies the adversarial boundary case. A lazy/high
image more than 4,000 px below the viewport makes no request. It starts High
after being scrolled into view, while a later lazy/automatic image remains
unrequested. The analyzer decision is
`adopt-native-lazy-first-image-priority`.

The focused application suite passes 16/16, the static-tier suite passes
18/18, Contentlayer regenerates 1,123 documents, and Next's production webpack
phase compiles in 8.3 seconds. The repository-wide TypeScript phase then stops
on 17 pre-existing intentional-error examples under the Rust teaching
experiments; none are in the PERF-041 paths.
