# PERF-040: Next.js `sizes` viewport-token reproduction

PERF-040 found a candidate-generation asymmetry in Next.js 16.3.4 and in the
current canary source. The browser accepts viewport units inside CSS math
functions without whitespace after the opening parenthesis, but Next.js uses:

```ts
/(^|\s)(1?\d?\d)vw/g;
```

to reduce the generated candidate list. Consequently, `100vw` is detected but
`calc(100vw - 2rem)` is not. Decimal values such as `33.3vw` are also missed.
The browser still selects the correct resource from the larger list, so this is
an HTML-efficiency defect rather than an image-correctness defect.

Run the pinned reproduction from the repository root:

```bash
node experiments/next-image-sizes-parser/reproduce.mjs
```

With this site's image configuration, Next.js 16.3.4 emits nine candidates for
`100vw`, sixteen for `calc(100vw - 2rem)`, and nine again for the semantically
equivalent `calc( 100vw - 2rem)` workaround. On the measured MDX image, the
workaround reduces the serialized `srcset` from 1,440 to 818 bytes.

[`next-upstream.patch`](./next-upstream.patch) widens the token boundary,
supports decimal viewport values, switches the conversion to `parseFloat`, and
adds unit coverage in Next.js's existing `next-image-get-img-props` suite. It is
an upstream-ready proposal, not a mutation of the installed dependency.

The relevant current source is
[`packages/next/src/shared/lib/get-img-props.ts`](https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/get-img-props.ts),
and the proposed test belongs in
[`test/unit/next-image-get-img-props.test.ts`](https://github.com/vercel/next.js/blob/canary/test/unit/next-image-get-img-props.test.ts).
