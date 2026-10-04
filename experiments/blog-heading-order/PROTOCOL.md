# PERF-059 — Corpus-wide blog heading-order normalization

## Hypothesis

The remaining blog heading-order failures are authoring-level rank gaps rather than layout defects. Normalizing those ranks in the MDX sources should remove every skipped heading transition without changing heading text or generated anchor IDs.

## Baseline

- Scan every `data/blog/*.mdx` document with a Markdown syntax tree so fenced examples are excluded.
- Treat the page-layout title as the preceding `h1` for each article.
- Record each transition that descends by more than one rank.
- The queue's count of 65 included `BufReader-rust`, which PERF-058 already corrected; 64 first-heading cases remain.

## Candidate

- Compress only skipped ranks in the MDX syntax tree while preserving each document's relative heading hierarchy. This deliberately leaves the reviewed source bytes untouched so the content-governance fingerprints remain authoritative.
- Apply the same normalization to the compiled body and generated table-of-contents depth, then add a read-only audit to `prebuild` so later content cannot produce a rendered skipped rank.
- Sample the rendered heading trees from a first-`h3` article, the first-`h4` article, a nested hierarchy, and an internal `h2`→`h4` case.

## Acceptance gates

1. All blog MDX files contain zero heading-rank skips when evaluated beneath the layout's `h1`.
2. Heading text and therefore generated slug IDs remain unchanged.
3. The source audit, prebuild tests, Contentlayer generation, and isolated production build pass.
4. Sampled production pages expose the expected sequential heading hierarchy in the accessibility tree and Lighthouse reports no `heading-order` failure.
