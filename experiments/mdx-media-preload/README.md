# PERF-042 — media-gated responsive MDX image preload

PERF-042 asks whether the first MDX diagram can be discovered before layout on
the desktop layouts where it is a verified image LCP, without turning the same
image eager on mobile or weakening lazy loading for later/far content.

## Decision

Adopt `adopt-opt-in-media-gated-responsive-preload` for the two measured
diagrams. Do not infer preload eligibility from “first image” alone.

The application keeps the PERF-041 image contract:

```html
<img loading="lazy" fetchpriority="high" ... />
```

For an explicitly measured source, the wrapper also asks React to emit the
exact Next.js responsive candidate set behind this gate:

```html
<link
  rel="preload"
  as="image"
  imagesrcset="...the same candidates as the img..."
  imagesizes="...the same sizes expression as the img..."
  fetchpriority="high"
  media="(min-width: 1280px) and (min-height: 640px)"
/>
```

`getImageProps()` produces the same optimizer URLs, `srcset`, and `sizes` as
the real `NextImage`. `ReactDOM.preload()` inserts the resource hint in the
server response. The media query matches the measured 1,440 × 1,000 layout,
where both images intersect the initial viewport, and does not match the 390 ×
844 layout. The image itself remains lazy on both.

The source-to-media map lives beside the Contentlayer transform. That is
deliberately an allowlist, not a generic rule: a server-side AST knows image
order but cannot know its final CSS geometry for every viewport.

## Controlled result

The matrix uses five cache-disabled isolated navigations for each of two live
routes at 390 × 844 and 1,440 × 1,000, DPR 1. CDP applies 150 ms latency and a
200,000 B/s downlink before navigation.

| Route / profile         | Request start median |  Response end median |           LCP median | Resource initiator |
| ----------------------- | -------------------: | -------------------: | -------------------: | ------------------ |
| Control plane / mobile  |     945.4 → 929.4 ms | 1,507.0 → 1,515.1 ms |         956 → 936 ms | `img` → `img`      |
| Load balancer / mobile  | 1,055.8 → 1,083.6 ms | 1,379.7 → 1,402.4 ms |     1,060 → 1,092 ms | `img` → `img`      |
| Control plane / desktop |     942.3 → 165.9 ms |   1,814.7 → 824.6 ms |   **1,864 → 940 ms** | `img` → `link`     |
| Load balancer / desktop |   1,060.6 → 270.9 ms |   1,567.3 → 742.9 ms | **1,588 → 1,056 ms** | `img` → `link`     |

The desktop LCP reductions are 924 ms and 532 ms beyond the already adopted
PERF-041 lazy/high policy. The mobile LCP shifts are −20 ms and +32 ms with
unchanged text-LCP identities; they are treated as noise, not a mobile win or
regression.

Every one of the 20 candidate navigations made exactly one request for the
selected image. The matching desktop request was link-initiated; the
mismatching mobile request remained img-initiated. Geometry, selected optimizer
URL, encoded image bytes, loading mode, priority, and LCP identity are
preserved. The preload adds 2,404 and 2,385 raw development-response bytes to
the two documents because the responsive candidates are serialized in the
HTML/Flight representation. Those are not claimed as compressed transfer
bytes.

## The adversarial gate

`verify-media-gate.mjs` places the candidate more than 4,000 px below the
viewport and a later unpromoted image another 5,000 px below it.

- At 390 × 844 the media query does not match: neither image makes a request
  before scroll. Approaching the first image starts one High-priority request;
  the later image stays unfetched.
- At 1,440 × 1,000 the query matches: the first image requests immediately even
  though the synthetic fixture puts it far away.

The second observation is the safety lesson. A matching preload overrides
native lazy eligibility. That is why production opts in only the two sources
whose matching-layout rectangles were measured at 629 px and 533 px inside a
1,000 px viewport. Future diagrams stay lazy/high until separately measured.

## Failed and corrected paths

1. The first trial changed Markdown image syntax to explicit JSX so it could
   carry `preloadMedia`. That dropped Pliny's probed intrinsic dimensions from
   generated MDX and could weaken the pre-decode aspect-ratio reservation. It
   was reverted; the build transform now adds the opt-in after dimensions are
   probed.
2. Rendering a literal `<link>` next to the image produced two serialized
   preload tags under React resource hoisting. Calling `ReactDOM.preload()`
   produced one canonical hint and was retained.
3. Global eager loading remains rejected. It cannot preserve the synthetic
   far-image zero-request invariant and would preload the mobile layout even
   where text remains LCP.

## Framework boundary

The platform and React already support responsive preloads with `media`, but
current Next/Image does not expose that option. The application therefore uses
the public [`getImageProps()` API](https://nextjs.org/docs/app/api-reference/components/image#getimageprops)
to avoid hand-assembling optimizer URLs and passes the result to
[`ReactDOM.preload()`](https://react.dev/reference/react-dom/preload). The
responsive-preload construction follows the browser model documented by
[web.dev](https://web.dev/articles/preload-responsive-images).

A separate Next.js 16.3.4 reproduction and patch live in
`../next-image-preload-media`. The patch is intentionally not applied to
`node_modules`.

## Reproduce

With the live app on port 3121:

```bash
PERF042_PHASE=lazy-high node measure.mjs
PERF042_PHASE=media-preload node measure.mjs
node verify-media-gate.mjs
node analyze.mjs
```

Artifacts:

- `results/perf042-lazy-high.json` — 20-run adopted PERF-041 baseline.
- `results/perf042-media-preload.json` — 20-run final candidate.
- `results/perf042-media-gate.json` — adversarial matching/mismatching proof.
- `results/perf042-analysis.json` — executable invariants and decision.
