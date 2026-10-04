# Next.js webpack module-polyfill reproduction

This minimal Next.js 16.3.4 App Router application reproduces the module-polyfill bundle shipped to modern browsers by the webpack production build. Its second build replaces Next's internal all-in-one module with only the `URL.canParse` fallback still required across the framework's documented default browser range: Chrome 111+, Edge 111+, Firefox 111+, and Safari 16.4+.

## Run independently

```bash
npm install
npm run build:baseline
npm run build:url-only
npm run measure
```

From the parent case-study repository, the already installed exact dependencies can be used without another install:

```bash
../../node_modules/.bin/next build --webpack
POLYFILL_MODE=url-only ../../node_modules/.bin/next build --webpack
node measure.mjs
```

The measurement excludes the separate `nomodule` script because a modern module-capable browser does not request it. It reports request count, raw/gzip/Brotli startup JavaScript, the seven patterns that Chrome's Legacy JavaScript detector reports, and the retained URL fallback.

The controlled Next.js 16.3.4 webpack fixture produced:

| Initial JavaScript | Next default | URL-only compatibility |   Change |
| ------------------ | -----------: | ---------------------: | -------: |
| Requests           |            4 |                      4 |        0 |
| Raw                |    445,608 B |              444,322 B | −1,286 B |
| Gzip               |    131,222 B |              130,846 B |   −376 B |
| Brotli             |    109,235 B |              108,879 B |   −356 B |
| Reported patterns  |            7 |                      0 |       −7 |
| URL fallback       |      present |                present | retained |

## Scope

The fixture is intentionally a plain one-page application. It proves that the compatibility code originates in Next's client bootstrap rather than application code. The production site supplied the browser-level transfer comparison and fallback test; those results are summarized on the [site performance lab page](https://www.mehdi.cz/work/site-performance-lab#upgrade-baseline).

This is not a proposal to remove all compatibility code. Removing `URL.canParse` would drop part of Next.js 16's current support contract. It is also not a new upstream issue: issue #86785 and pull requests #87270 and #88551 already cover the underlying Next.js work. The remaining evidence is useful specifically because #88551's selective implementation is Turbopack-oriented while the measured site retains webpack behind a Flight-size regression budget.
