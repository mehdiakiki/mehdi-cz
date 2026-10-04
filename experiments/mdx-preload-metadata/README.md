# PERF-043 — production cost of exact responsive preload metadata

PERF-043 challenges the apparent 2.4 kB raw-document cost introduced by
PERF-042. The question is deliberately falsifiable: can a smaller preload hint
preserve the selected optimizer URL, one-request reuse, desktop LCP, and the
mobile/far lazy boundary across device-pixel ratios?

## Decision

Retain the full exact responsive preload. Do not ship DPR-pruned candidates.

The accepted production code is unchanged from PERF-042. Its nine-candidate
preload costs only 250/344 gzip bytes or 116/126 Brotli bytes above the
no-preload production documents. The byte ceiling is too small to justify a
new source of candidate-selection drift, and both pruning attempts failed an
adoption condition.

## Four production artifact builds

All builds use Next.js 16.3.4's split `compile`/`generate` production path,
Node.js 24.20.0, the same 1,550 statically generated pages, and the fixed build
ID `perf043-fixed`. Fixing the build ID matters: an earlier comparison allowed
Next.js to generate a different ID for each build, introducing small unrelated
gzip/Brotli changes. Those preliminary numbers were discarded and replaced.

The temporary `variant-harness.patch` defines four isolated-worktree modes:

- `none` removes only the two measured preload opt-ins.
- `full` is the accepted nine-candidate exact `imagesrcset`/`imagesizes` hint.
- `dpr-1-2` retains only the 828w and 1920w URLs and uses `762px`.
- `desktop-dpr-ge-1` retains every candidate reachable by the fixed desktop
  slot at DPR ≥1: 828, 1080, 1200, 1920, 2048, and 3840. Its media condition
  adds `(min-resolution: 1dppx)`, leaving lower DPRs on native lazy loading.

The following table compares complete production HTML, not an isolated link:

| Route         | Full over none raw | Full over none gzip | Full over none Brotli | Two vs full gzip/Brotli | Safe six vs full gzip/Brotli |
| ------------- | -----------------: | ------------------: | --------------------: | ----------------------: | ---------------------------: |
| Control plane |           +2,371 B |              +250 B |                +116 B |        −63 B / **+9 B** |             **+3 B / +44 B** |
| Load balancer |           +2,352 B |              +344 B |                +126 B |          −160 B / −10 B |             **+15 B / +5 B** |

The full `<link>` alone is 1,113–1,122 raw bytes, but whole-document compression
can reuse its optimizer path, source name, media query, and candidate syntax
against the image and embedded Flight payload. Raw-size subtraction therefore
overstates transfer cost by roughly an order of magnitude.

The six-candidate attempt demonstrates a less obvious effect: deleting 718–724
raw bytes makes every complete compressed document larger. The removed strings
were highly repetitive, while the added resolution predicate is unique.

## Production browser matrix

Each variant has 28 cache-disabled Chrome navigations over both measured
routes at 1,440 × 1,000. DPR 1 and 2 have five repetitions per route; DPR 0.8,
1.25, 1.5, and 3 are explicit boundary probes. CDP applies 150 ms latency and a
200,000 B/s downlink before navigation.

The full hint makes exactly one link-initiated target request in all 28 rows.
Its standard-profile medians are:

| DPR / route       | Request start |    LCP |
| ----------------- | ------------: | -----: |
| 1 / control plane |      169.2 ms | 836 ms |
| 1 / load balancer |      169.3 ms | 808 ms |
| 2 / control plane |      170.1 ms | 832 ms |
| 2 / load balancer |      166.8 ms | 820 ms |

Both compact forms remain within ordinary run noise at DPR 1 and 2. That is not
enough for adoption: their median request starts differ from the full form by
at most 3.2 ms and LCP by at most 12 ms in either direction. The full metadata
therefore has no measurable early-parser cost in this matrix; the boundary
probes are what separate the candidates.

### Failure 1: the attractive two-candidate shortcut

The two-candidate form passes all 20 DPR 1/2 rows and saves 1,574–1,588 raw
document bytes. It nevertheless makes two different optimizer requests in
seven of the eight boundary rows:

- DPR 0.8 preloads 828w while the image selects 640w on both routes.
- DPR 1.25 preloads 1920w while the image selects 1080w on both routes.
- DPR 1.5 preloads 1920w while the control-plane image selects 1200w.
- DPR 3 preloads 1920w while the image selects 3840w on both routes.

The wrong preload consumes the shaped connection before the image discovers
its real candidate. Affected LCP is 500–812 ms slower than the full-hint control.
Optimizing only for integer DPR 1/2 would therefore have converted 63–160 gzip
bytes of savings into an extra image download and a large real regression.

### Failure 2: keep every reachable candidate

The six-candidate form is behaviorally safe in the measured range: all 28 rows
make one request, DPR ≥1 remains link-initiated, and DPR 0.8 cleanly falls back
to an img-initiated lazy request. It still fails the byte gate. The complete
documents become 3–15 gzip bytes and 5–44 Brotli bytes larger than the full
form, with no LCP improvement at DPR 1/2.

This attempt is not retained in production merely because it “looks cleaner”
in raw HTML. Compression is part of the architecture and must be measured on
the complete response.

## Final trace and retained boundaries

The final unthrottled DevTools trace on the accepted load-balancer route reports
101 ms LCP and CLS 0. The 828w AVIF queues at 10 ms with High priority; resource
load delay is 7 ms. The trace made one target-image request, and the accessibility
tree retains “Load Balancer Architecture.” Because the trace reload revalidated
the local document, it is only a final sanity check; timing comparisons come
from the fresh-context shaped matrix.

PERF-042's adversarial proof remains authoritative for nonmatching layouts: a
mobile media mismatch makes zero requests while the candidate is more than
4,000 px below the viewport, and approaching it starts one High-priority lazy
request. PERF-043 leaves that production policy untouched.

## Reproduce safely

Use a clean throwaway worktree because the harness deliberately changes build
behavior and must not ship:

```bash
git apply experiments/mdx-preload-metadata/variant-harness.patch
PERF043_PRELOAD_VARIANT=dpr-1-2 PERF043_BUILD_ID=perf043-fixed \
  node ./node_modules/next/dist/bin/next build --webpack --experimental-build-mode compile
PERF043_PRELOAD_VARIANT=dpr-1-2 PERF043_BUILD_ID=perf043-fixed \
  node ./node_modules/next/dist/bin/next build --webpack --experimental-build-mode generate
PERF043_PRELOAD_VARIANT=dpr-1-2 node experiments/mdx-preload-metadata/audit-build.mjs
PERF043_PRELOAD_VARIANT=dpr-1-2 node experiments/mdx-preload-metadata/measure.mjs
node experiments/mdx-preload-metadata/analyze.mjs
git apply -R experiments/mdx-preload-metadata/variant-harness.patch
```

Generate Contentlayer from a fresh `.contentlayer` directory when switching to
or from `none`; Contentlayer's cache does not treat this experiment environment
variable as an input. The retained result files are sufficient to rerun the
analyzer without rebuilding.

Artifacts:

- `audit-build.mjs` — exact production HTML/Flight raw, gzip, and Brotli audit.
- `measure.mjs` — 84-run fresh-browser DPR matrix.
- `analyze.mjs` — executable byte, request-reuse, lazy-boundary, and decision gates.
- `variant-harness.patch` — temporary no-preload and candidate-width build modes.
- `results/perf043-*-artifacts.json` — four fixed-build-ID artifact snapshots.
- `results/perf043-*-browser.json` — three 28-run browser matrices.
- `results/perf043-analysis.json` — derived comparisons and final decision.
- `results/perf043-devtools.json` — final trace summary and its cache caveat.
