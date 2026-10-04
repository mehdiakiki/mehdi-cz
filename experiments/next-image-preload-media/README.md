# Next/Image media-scoped preload reproduction

This is the framework finding extracted from PERF-042. It is separate from the
application workaround so the boundary is explicit.

## Current behavior

`reproduce.mjs` renders this conceptual input on Next.js 16.3.4:

```tsx
<Image
  src="/test.png"
  width={800}
  height={600}
  sizes="(max-width: 1279px) 100vw, 762px"
  preload
  preloadMedia="(min-width: 1280px)"
/>
```

The runtime emits an image preload with no `media`, forwards `preloadMedia` to
the `<img>`, logs React's unknown-prop warning, and rejects adding
`loading="lazy"`. The raw observation is retained in
`results/next-16.3.4.json`.

This is not a new product request invented by the site. Next.js users requested
the same `preloadMedia` shape in
[discussion #25171](https://github.com/vercel/next.js/discussions/25171) in 2021,
and later requests describe the same responsive/hidden-image cost in
[#29621](https://github.com/vercel/next.js/discussions/29621) and
[#71393](https://github.com/vercel/next.js/discussions/71393). Current
[`ImageProps`](https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/get-img-props.ts)
and
[`ImagePreload`](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/image-component.tsx)
still do not carry a media query.

## Proposed patch

`next-upstream.patch` adds a backward-compatible `preloadMedia?: string`:

- existing `preload` behavior is unchanged when the new prop is absent;
- a scoped preload remains `loading="lazy"` by default, so a media mismatch
  does not turn the underlying image eager;
- the prop is carried in image metadata instead of leaking onto `<img>`;
- App Router `ReactDOM.preload` and Pages Router `<link>` paths receive `media`;
- the development LCP warning accounts for a matching scoped preload;
- three `getImageProps` cases and one rendered-component case cover lazy
  fallback, validation, exact `srcset`/`sizes`, and DOM non-leakage.

The patch applies cleanly with `git apply --check` to the fetched current-canary
source and test files as of September 10, 2026. It has not been run inside a
complete Next.js monorepo checkout, so it is described as upstream-ready, not
upstream-validated or merged.

Run the installed-version reproduction with:

```bash
node reproduce.mjs
```
