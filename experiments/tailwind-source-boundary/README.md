# PERF-050: Close Tailwind's source boundary before splitting route CSS

## Decision

Retain `source(none)` on the Tailwind import while preserving the existing
explicit `content` sources. This removes accidental research/build inputs,
reduces generated CSS, and sharply reduces the cost of compiling it in this
artifact-heavy working tree. It does not establish a general LCP improvement.

The public summary of this experiment is on the
[site performance lab page](https://www.mehdi.cz/work/site-performance-lab#tailwind).

## Hypothesis and revision

The [preregistered protocol](PROTOCOL.md) began with the remaining global CSS gate
after PERF-049. Before trying a shared core and route additions, it required
checking what generated the existing stylesheet. That check revealed that
Tailwind 4.3.3's automatic discovery coexisted with the legacy `content` array.
The array registered sources; it did not exclude the rest of the repository.

The initial automatic compile registered 34,780 dependencies versus 1,279 in the
bounded compile. Three prior Next builds accounted for 30,803 entries. The complete
registered file sizes were about 12.04 GB versus 8.01 MB. These are manifest
statistics, **not measured disk I/O** and not proof that every binary byte was
parsed. The subsequent compiler benchmark measures time and peak process memory
directly rather than deriving them from this inventory.

The implementation changes one import modifier in `css/tailwind.css`:

```css
@config "../tailwind.config.cjs";
@import "tailwindcss" source(none);
```

`tailwind.config.cjs` still includes the application, component, layout, MDX, and
Pliny sources. `scripts/performance-audit.js` now rejects an unbounded global
Tailwind import. The source assertion is backed by a functional compiler proof,
not presented as a browser performance test.

## Causal compiler proof

The hermetic fixture verifies independent negative and positive controls:

| Input state | Automatic output | Bounded output |
| --- | ---: | ---: |
| Application only | 4,310 B | 4,310 B, identical SHA-256 |
| Add valid utilities in a research note | 4,339 B | 4,310 B, unchanged SHA-256 |
| Add a utility in configured application code | not needed for this control | 4,336 B, new utility present |

The result establishes both exclusion of non-UI text and continued inclusion of
new UI classes. `results/boundary-proof.json` records the hashes, installed
version, and assertions. Temporary fixture files are removed by the script.

## Compilation cost

After browser timing completed, three fresh-process pairs alternated treatment
order. No OS cache eviction was attempted. The later inventory includes the new
`.next-perf050` build as well as the three retained builds. Automatic dependencies
were 44,601–44,614; the few extra benchmark output manifests did not change CSS
identity. All automatic output hashes matched one another, and all bounded output
hashes matched one another and the original bounded artifact.

| Measured process property | Automatic median | Bounded median |
| --- | ---: | ---: |
| Elapsed | 77,163.5 ms | 355.2 ms |
| Range of elapsed | 72,282.8–80,272.4 ms | 347.5–359.5 ms |
| User + system CPU | 523,247.9 ms | 909.1 ms |
| Peak RSS | 14,361.5 MiB | 157.0 MiB |

Elapsed falls by 99.54%, approximately 217×, for this isolated compilation task
on this working tree. Peak process RSS falls by 98.91%. CPU time can exceed
elapsed time because native work uses multiple threads. These are not end-to-end
Next build speedups, clean-checkout guarantees, or browser runtime memory savings.
The first automatic process overlapped the independent browser **correctness**
checks; none overlapped the 160-row browser timing matrix. The other two compiler
pairs show the same large separation.

`results/compiler-benchmark.json` retains all six observations; each corresponding
compile manifest retains the dependency inventory. The benchmark intentionally
does not delete existing user build trees or caches to manufacture a clean repo.

## CSS and production artifacts

Two matched PostCSS compilations differ by 60 generated class names, with no
classes added by the bounded variant. The complete stylesheet includes a
preserved suffix containing alert styles and Next font declarations.

| Comparison | Automatic/control | Bounded/candidate | Delta |
| --- | ---: | ---: | ---: |
| Matched complete raw CSS | 92,041 B | 86,392 B | −5,649 B |
| Matched complete gzip CSS | 15,908 B | 14,978 B | −930 B |
| Retained → fresh Next chunk, raw | 89,482 B | 84,663 B | −4,819 B |
| Retained → fresh Next chunk, gzip | 15,828 B | 14,945 B | −883 B |

The matched comparison holds compilation/minification and non-Tailwind CSS
constant. The production comparison includes Next's additional minification and
different build times; do not use it as an isolated timing attribution. The new
production chunk is `ebc471532293f512.css`.

An audit scanned all 1,564 retained HTML files and 822,262 literal class
attributes. None used any of the 60 removed classes. Interactive states receive
their own browser checks; the static census alone is insufficient to prove them.

Exploratory exclusion arms removed raw MDX sources and/or Pliny from discovery.
They produced only another 2,493 raw bytes or 441 raw bytes of reduction compared
with the bounded Tailwind-only artifact. They were **not adopted**: those paths
include legitimate style sources, and runtime coverage cannot justify removing
their authoring contract. Their compile results remain labeled `no-data` and
`no-pliny`, rather than being folded into the retained saving.

## Coverage matrix and the overlapping-layer trap

The baseline survey visits five routes at 390 × 844/DPR 2.75 mobile and
1440 × 900/DPR 1 desktop sizes, capturing four cumulative states per route:
initial light mode, footer, dark mode, and opened search.

The raw CDP coverage includes both rule ranges and enclosing CSS-layer ranges.
Summing them initially reported 100–118% usage. The corrected analyzer intersects
exact PostCSS style-rule offsets and discards enclosing group ranges.

| Route | Initial mobile matched style-rule share | After scroll/dark/search |
| --- | ---: | ---: |
| Home | 12.9% | 19.2% |
| Writing index | 12.2% | 19.0% |
| Prose article | 18.3% | 25.9% |
| Code article | 18.5% | 26.1% |
| Atlas | 13.3% | 18.7% |

These shares use the complete stylesheet as denominator but count only matched
style rules in the numerator; they are **not** a dead-byte budget. They are also
not viewport-only or first-paint-criticality measurements. Font declarations,
property registrations, unvisited states, and different routes remain relevant.
The matrix motivates a later source-aware route partition; it does not implement
one.

## Controlled browser timing

Chromium 146.0.7680.80, 150 ms emulated latency, 1.6 Mbps downstream, 750 kbps
upstream, and 4× CPU slowdown. Both mobile and desktop use this same shaping.
Every load has a fresh browser context. Eight repetitions alternate arm order per
route. Total: 160 navigations, 80 pairs. Samples end 700 ms after load; they are
not an indefinite all-resources completion measurement.

Both arms run the same HTTP proxy over `.next-perf049`. Only the shared CSS
response differs. Both use gzip, identical immutable cache policy, the same URL
path, and the same non-CSS production responses. Buffers are loaded at startup,
so later filesystem changes cannot alter an in-flight arm.

| Profile / route | Paired median LCP change | Paired bootstrap 95% interval |
| --- | ---: | ---: |
| Mobile home | +22 ms | −20 to +32 ms |
| Mobile index | +2 ms | −24 to +12 ms |
| Mobile prose | −4 ms | −16 to +8 ms |
| Mobile code | −22 ms | −36 to +56 ms |
| Mobile Atlas | +4 ms | −4 to +28 ms |
| Desktop home | −2 ms | −36 to +4 ms |
| Desktop index | −8 ms | −40 to −4 ms |
| Desktop prose | 0 ms | −64 to +48 ms |
| Desktop code | 0 ms | −40 to +56 ms |
| Desktop Atlas | −8 ms | −16 to +4 ms |

Intervals use 10,000 deterministic paired bootstrap resamples. Eight pairs per
cell are a small sample, and ten cells are not a multiplicity-adjusted search
for significance. One promising desktop-index result does not establish a
general speedup. All five mobile intervals include zero. The byte and compilation
results carry the decision; no broad LCP, INP, ranking, or field claim follows.

All 80 mobile loads have zero observed CLS. Desktop cold-font loads reveal small
shifts in both arms: home 0.0009402, index 0.0022707, prose 0.0008721, Atlas
0.0001602, and code either zero or 0.0015760. The code route's occurrence rate
differs in the small sample. This fails an absolute zero-CLS assertion for the
desktop baseline and requires separate attribution; do not silently summarize
the matrix as “CLS 0.” `attribute-shifts.mjs` records the follow-up intervention
and shift-source rectangles in `results/shift-attribution.json`.

## Correctness and validation

- 45 final visual states preserve exact sampled pixels and all recorded computed
  styles and geometry. Original PNGs are retained. Only four physical scrollbar
  pixels at the right edge are excluded from the pixel comparison.
- All five routes preserve identical content and style probes with JavaScript
  disabled.
- Hard navigation to a second route reuses global CSS with zero transfer bytes.
- Home/index soft navigation preserves a window marker, proving the document
  survives, and retains a single global stylesheet instance.
- Ctrl-K focuses the search combobox; typing returns ten results; Escape closes
  the dialog. The runtime verification records zero exceptions and zero CLS in
  its warm soft-navigation sequence.
- The full prebuild contract passes 121/121; the source performance audit passes
  25/25. An initial parallel test invocation reported an article-style fixture
  failure; its isolated rerun and the full repeated prebuild both passed without
  a source change. No failure was erased from the account.
- The isolated production build compiled and generated 1,577 routes. It uses
  the pre-existing opt-in `PERF_EXPERIMENT_IGNORE_TYPE_ERRORS=true` because
  intentionally invalid teaching fixtures remain in the broad TypeScript
  project. This is a compilation/static-generation check, not a claim that the
  normal full TypeScript gate passes. New `.next-perf050` generated type paths
  were removed from the source configuration after the experiment.

## Reproduce

Use the recorded Node 24.20.0 toolchain. Install dependencies through the
repository's existing lockfile, then retain a production baseline. The proxy
currently pins the PERF-049 global chunk path and suffix boundary deliberately;
adapting to a different build requires updating those inputs and their hashes.

```bash
node experiments/tailwind-source-boundary/scripts/compile.mjs automatic
node experiments/tailwind-source-boundary/scripts/compile.mjs bounded
node experiments/tailwind-source-boundary/scripts/prove-boundary.mjs
node experiments/tailwind-source-boundary/scripts/audit-artifacts.mjs
```

Serve `.next-perf049` at `127.0.0.1:3150`, then run separate proxy processes:

```bash
node experiments/tailwind-source-boundary/scripts/proxy.mjs automatic-complete 3151
node experiments/tailwind-source-boundary/scripts/proxy.mjs bounded-complete 3152
```

Launch an isolated Chromium debugging instance on port 9250. Run diagnostic,
correctness, timing, and compiler workloads separately:

```bash
node experiments/tailwind-source-boundary/scripts/coverage.mjs
node experiments/tailwind-source-boundary/scripts/analyze-coverage.mjs
node experiments/tailwind-source-boundary/scripts/verify.mjs
node experiments/tailwind-source-boundary/scripts/verify-runtime.mjs
node experiments/tailwind-source-boundary/scripts/measure.mjs
node experiments/tailwind-source-boundary/scripts/analyze.mjs
node experiments/tailwind-source-boundary/scripts/attribute-shifts.mjs
node experiments/tailwind-source-boundary/scripts/benchmark-compiler.mjs
```

The compiler benchmark deliberately exercises the unbounded control, which used
about 14 GiB of peak process memory here. It should not run during browser timing
or on a host without room for that measured workload. This is a concrete measured
resource requirement, not a prerequisite for keeping the source fix.

## Next experiments

1. Attribute the desktop cold-font shifts, then evaluate a fallback-metric or
   font-delivery change under the same layout and completion contract.
2. Compare a shared core plus route additions against this corrected CSS
   baseline. Preserve utility precedence after soft navigation, complete
   responsive/interaction states, no-JavaScript output, and cross-page caching.
3. If current App Router cannot express the necessary ordering/lifetime boundary,
   build a minimal framework reproduction. Do not infer a Next.js bug from
   Tailwind's documented source-detection behavior.

## Primary references

- [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Next.js CSS ordering and lifetime](https://nextjs.org/docs/app/getting-started/css)
- [Chrome DevTools coverage](https://developer.chrome.com/docs/devtools/coverage/)

The installed Next CSS guide was read before implementation, as required by the
repository's `AGENTS.md`.
