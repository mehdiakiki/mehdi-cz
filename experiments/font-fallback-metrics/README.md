# PERF-056: Attribute and test the desktop cold-font shift

## Decision

Retain the current font configuration. The cold desktop shift is real and caused
by the Space Grotesk exchange, but no tested fallback-metric arm satisfied the
cross-route typography gate. Do not trade it for `font-display: optional` or
`block`: the former can leave a cold visit without the branded font, while the
latter can hide primary text until the font is available.

No application, font, or production CSS source was changed. The experiment
stopped before the 160-navigation timing matrix because every active candidate
failed a deterministic geometry or identity gate. The one browser smoke was an
attribution/preflight check, not an LCP comparison.

## What was actually happening

PERF-050 had already isolated the font: priming only the 22,588-transfer-byte
Space Grotesk response removed every observed shift while CSS stayed cold. Its
cold desktop CLS range was 0.0001602–0.0022707; all measured mobile loads were
zero.

Next.js emitted an adjusted fallback face with Arial at 110.84% and ascent,
descent, and line-gap overrides. In the Linux Chromium environment, however,
that face reports `status: error`: `local("Arial")` does not resolve as a literal
local source. The browser skips the adjusted face and renders the next stack
entry, `system-ui`, which resolves here to Noto Sans. That explains why changing
all four generated descriptors initially changed neither a single source
rectangle nor CLS.

The five-route desktop smoke made the null mechanism explicit:

| Route | Control CLS | Metric-only candidate CLS |
| --- | ---: | ---: |
| Home | 0.0009402 | 0.0009402 |
| Writing index | 0.0022707 | 0.0022707 |
| Prose article | 0.0008721 | 0.0008721 |
| Code article | 0.0015760 | 0.0015760 |
| Atlas | 0.0001602 | 0.0001602 |

Every value and recorded pre/post rectangle was bit-identical. LCP observations
from one pair per route are intentionally not interpreted.

The retained PERF-050 attribution used Chrome 146.0.7680.80; the resumed host
exposed Chrome 145.0.7632.159 for PERF-056. Every PERF-056 control and candidate
used that same 145 build, and its control reproduced the prior route CLS values
exactly, but this remains a matched lab comparison rather than a cross-version
browser claim.

## Candidate sequence

All candidate choice rules and stop gates were written before their successful
measurement.

### Route-informed Arial scale

Across 140 visible text runs (102 unique text/style specimens), a 107.35% Arial
scale reduced occurrence-weighted single-line advance RMSE from 25.45 to 19.01 px
(25.3%) and the largest error from 170.82 to 107.22 px. It preserved the sampled
line counts. This candidate passed its mathematical gate, but the browser smoke
showed that the underlying generated Arial face was unavailable and the arm was
inert.

### Available Arial-compatible face

Adding literal `Liberation Sans` made the fallback face load. Holding 107.35%
size and sweeping 97 ascent/descent allocations could not improve the selected
top/bottom geometry: the derivation winner remained delta zero, improvement was
0%, and Atlas changed one line count. This shows that ascent/descent overrides
do not control the relevant glyph rectangles sufficiently here.

A geometry-first 90–115% size sweep then searched for a line-preserving global
Liberation Sans face. Its best admissible arm was 108.25%, but maximum-route RMSE
rose from 8.03 to 34.07 px and pooled RMSE from 5.78 to 16.84 px. It improved the
home route while severely worsening the code route, which is exactly the failure
the preregistered minimax gate was designed to expose.

### Actual system fallback, with real weights

A single Noto Regular face found an apparently strong 102.7% scale, but its 100%
identity control failed because `system-ui` selects different installed files by
weight. The corrected topology mapped 400 to Regular, 500 to Medium, 600–700 to
Bold, and 800–900 to Black. Its 100% arm reproduced the current system fallback
and line/overflow state, so the final test was valid.

The best line-preserving weighted Noto arm was 102.1%. It failed decisively:

| Geometry score | Current `system-ui` | 102.1% Noto | Change |
| --- | ---: | ---: | ---: |
| Pooled coordinate RMSE | 5.78 px | 16.32 px | +182.5% |
| Worst-route RMSE | 8.03 px | 33.20 px | +313.4% |
| Code-route RMSE | 4.49 px | 33.20 px | +640.1% |

It also failed the rule that every route must be no worse. No active metric arm
was therefore eligible for cold LCP timing or source materialization.

## Why no `font-display` arm advanced

The primary font already preloads and completes in the cold traces. `fallback`
would still allow a later swap in that timing window, so it has no established
mechanism for eliminating the shift. `optional` can obtain zero swap CLS by
declining the webfont on the cold visit, which violates the explicit typography
completion contract. `block` can avoid showing fallback glyphs by hiding text,
which turns a tiny layout shift into a likely paint/LCP cost. None is a justified
trade for a maximum observed CLS of 0.0022707.

## DevTools spot check

The Chrome DevTools performance tool was run on the unchanged control at desktop
1440 x 900 under its Slow 4G / 4x CPU profile. The warm diagnostic reported
756 ms LCP, CLS 0, and no console warnings or errors. The warm CLS result is
consistent with the prior font-priming intervention; it is not substituted for
the fresh-context cold evidence.

## Reproduce

Serve the retained artifact and launch an isolated Chromium debugging instance:

```bash
NEXT_DIST_DIR=.next-perf050 ./node_modules/.bin/next start -H 127.0.0.1 -p 3150
google-chrome-stable --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9250 \
  --user-data-dir=/tmp/perf056-chrome about:blank
```

Then reproduce the deterministic stages:

```bash
node experiments/font-fallback-metrics/scripts/derive.mjs
node experiments/font-fallback-metrics/scripts/derive-available.mjs
node experiments/font-fallback-metrics/scripts/derive-geometry.mjs

PERF056_SIZE_START=94 PERF056_SIZE_END=106 PERF056_SIZE_STEP=0.1 \
PERF056_LOCAL_SOURCES='Noto Sans Regular' PERF056_METRIC_MODE=native \
PERF056_TIE_TARGET=100 PERF056_RESULT_NAME=noto-fallback-derivation.json \
node experiments/font-fallback-metrics/scripts/derive-geometry.mjs

PERF056_SIZE_START=94 PERF056_SIZE_END=106 PERF056_SIZE_STEP=0.1 \
PERF056_LOCAL_SOURCES='Noto Sans Regular' PERF056_METRIC_MODE=native \
PERF056_FONT_TOPOLOGY=noto-weighted PERF056_TIE_TARGET=100 \
PERF056_RESULT_NAME=noto-weighted-fallback-derivation.json \
node experiments/font-fallback-metrics/scripts/derive-geometry.mjs
```

The experiment intentionally retains the unsuccessful protocols and raw rows.
`inert-smoke.json` contains only ten diagnostic loads and must not be analyzed as
the preregistered timing matrix.

## Evidence and references

- [`PROTOCOL.md`](PROTOCOL.md) and the four follow-up protocols retain the
  decision boundaries introduced by each newly discovered mechanism.
- [`derivation.json`](results/derivation.json) contains the text corpus and
  route-informed advance calculation.
- [`inert-smoke.json`](results/inert-smoke.json) contains the metric-only browser
  preflight and failed-face status.
- [`available-fallback-derivation.json`](results/available-fallback-derivation.json),
  [`geometry-fallback-derivation.json`](results/geometry-fallback-derivation.json),
  [`noto-fallback-derivation.json`](results/noto-fallback-derivation.json),
  and [`noto-weighted-fallback-derivation.json`](results/noto-weighted-fallback-derivation.json)
  contain the active-face searches and gates.
- The installed [Next.js 16.3.4 font guide](../../node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md)
  documents `display`, `fallback`, and `adjustFontFallback`. The installed local
  loader source shows that automatic local-font adjustment emits a single Arial
  or Times New Roman local source.
- MDN documents that [`size-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/size-adjust)
  scales glyph outlines and metrics, and describes the timing behaviors of
  [`font-display`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display).
