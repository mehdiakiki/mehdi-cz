# PERF-052: Route-weighted CSS graph search

## Decision

Reject before browser timing. The experiment proves that graph tuning changes
how the existing root CSS outputs are packaged, but cannot create route ownership
from a global Tailwind entry. A conservative explicit core/writing/Rust/editor
partition does create route ownership, yet every measured route remains larger
than the retained webpack control after compression.

No production CSS import or route layout was retained. `next.config.js` keeps an
opt-in `PERF052_*` seam for reproducibility; ordinary builds do not set it and
continue to use Next.js defaults.

## Method

The negative control built the complete 1,622-page corpus for all twelve
`requestCost` x `weightDistribution` combinations. Each run used a clean scratch
directory, Node 24.11.1, Next.js 16.3.4, and Turbopack graph mode. Compact route
artifacts and logs were retained; the roughly 1.6 GB scratch trees were removed
after inspection.

The repository declares Node >=24.20.0, while the newest installed 24.x runtime
available to this resumed session was 24.11.1. Every compared Turbopack arm used
that same runtime, so the relative artifact result is internally matched, but a
release-qualification rerun should use the declared toolchain.

The explicit-source generator follows static imports from four route root sets.
Rules found in one family move to `core.css`, `writing.css`, `rust.css`, or
`editor.css`; anything shared, ambiguous, structural, or ownerless remains in
core. Its four outputs preserve the exact 903-leaf multiset of the compiled
Tailwind input. This is an artifact invariant, not a visual-correctness claim:
splitting files can still change cascade behavior, which is why browser checks
would have remained mandatory for an eligible candidate.

## Results

Next's graph algorithm found three packaging shapes in each topology. With the
single root entry, however, every representative route still imported 92,346 raw
application bytes. Depending on graph parameters these appeared as one, two, or
three requests; the best gzip form was 16,070 bytes on every route, versus 14,870
bytes for the retained webpack application chunk.

The conservative source split was dominated by its 76,122-raw / 13,215-gzip-byte
core. The documented default graph parameters (`requestCost=20000`,
`weightDistribution=0.1`) represent a ten-arm tie for the smallest weighted
output:

| Gate                            | Webpack control | Explicit graph | Result                       |
| ------------------------------- | --------------: | -------------: | ---------------------------- |
| Route-weighted CSS gzip         |      15,000.8 B |    16,133.45 B | 1,132.65 B worse; fail       |
| Route-weighted application gzip |        14,870 B |    16,002.65 B | 1,132.65 B worse; fail       |
| Three-route journey gzip        |        16,178 B |       17,941 B | 1,763 B / 10.90% worse; fail |
| Median blocking CSS requests    |               1 |              2 | +1; pass                     |
| Maximum repeated Flight share   |         1.1511% |        3.8332% | fail                         |
| Maximum repeated Flight bytes   |           927 B |        1,152 B | pass                         |

The explicit default arm was 3.69% slower and its sampled process-tree RSS was
1.67% higher than the matched single-entry Turbopack default, both within the 10%
limits. RSS is the maximum 25 ms sample of summed process-tree `VmRSS`; shared
pages can be counted more than once, so it is useful only as a matched diagnostic.

Relative to the single-entry Turbopack default, splitting saved just 67.35
route-weighted gzip bytes but added 563 bytes to the three-route journey because
the writing and Rust additions lose the compression and cache reuse of one shared
asset. It also added more CSS URLs to Flight. There is no eligible graph winner,
so materializing one in webpack would be post-selection work without a passing
candidate.

## Reproduce

Use the repository's required Node >=24.20.0 toolchain. The recorded exploratory
run used the locally available 24.11.1 binary as disclosed above:

```bash
node experiments/route-css-graph/scripts/generate-sources.mjs
node experiments/route-css-graph/scripts/run-single-topology-sweep.mjs
```

Apply the checked-in experiment-only import patch, run the explicit sweep, then
reverse it so no application ownership change remains:

```bash
git apply experiments/route-css-graph/explicit-source-imports.patch
node experiments/route-css-graph/scripts/run-single-topology-sweep.mjs explicit-sources
git apply -R experiments/route-css-graph/explicit-source-imports.patch
node experiments/route-css-graph/scripts/analyze.mjs
```

The authoritative compact decision is in `results/analysis.json`; the two sweep
summaries retain every arm, and the per-arm JSON files retain route URLs, bytes,
request counts, hashes, Flight measures, wall time, and sampled RSS.
