# Pliny pull-request draft: configurable Umami script strategy

Base: `timlrx/pliny@f6302e3e0723888accb2d8a02068d6bc5c1377b9`

## Title

`feat(analytics): allow configuring the Umami script strategy`

## Summary

- Add an optional `strategy` property to `UmamiProps`, using Next.js' exported `ScriptProps` type.
- Forward the value to `next/script` instead of allowing it to enter Umami's data-attribute mapping.
- Preserve the existing Next.js `afterInteractive` default when callers omit the property.
- Cover explicit forwarding, default compatibility, and existing Umami/custom-data mapping with focused tests.

## Motivation

The Umami wrapper currently offers tracker attributes and a custom `src`, but it does not expose Next.js' script-loading strategy. Consumers that need non-critical analytics to use `lazyOnload` must replace the Pliny wrapper with a direct `next/script` element.

In a production Next.js site, the current wrapper caused the tracker to be preloaded and fetched at 206.2 ms, before the 310 ms LCP in a throttled mobile trace. The equivalent `lazyOnload` element began at 402.5 ms, after both LCP and the 342.5 ms load event. Those timings motivate configurability; they are application-level evidence, not a universal timing claim for this library patch.

This is consistent with Pliny's existing Plausible component, which already schedules its scripts with `lazyOnload`. Umami keeps its current default for backward compatibility and allows each consumer to choose.

## Compatibility

`ScriptProps` is exported by both Next.js 13.0.0, the lower bound of Pliny's peer dependency, and current Next.js 16.3.4. The new property is optional. Omitting it passes `undefined`, so `next/script` continues to select its existing `afterInteractive` default.

## Validation

```text
yarn vitest run packages/pliny/test/analytics/Umami.test.tsx
Test Files  1 passed (1)
Tests       3 passed (3)

yarn test
Test Files  1 passed (1)
Tests       3 passed (3)

yarn workspace pliny exec tsc --noEmit --jsx react-jsx --moduleResolution node --module esnext \
  --target es2018 --esModuleInterop --skipLibCheck \
  src/analytics/Umami.tsx \
  test/analytics/Umami.test.tsx
exit 0

yarn workspace pliny build
exit 0

yarn prettier --check packages/pliny/src/analytics/Umami.tsx \
  packages/pliny/test/analytics/Umami.test.tsx \
  .changeset/slow-analytics-load-later.md
exit 0
```

## Patch

The submission-ready diff is stored beside this draft as `pliny-umami-script-strategy.patch`.
