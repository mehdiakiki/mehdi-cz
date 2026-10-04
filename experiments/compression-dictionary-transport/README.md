# PERF-054 — Compression Dictionary Transport

This experiment evaluates dictionary-compressed Brotli for held-out static blog
documents. It is isolated from the application and starts with artifact economics
and byte-exact protocol checks. Browser and Cloudflare runs are eligible only if
those gates pass.

Status: completed and rejected at the artifact economics gate. Both dictionary
sizes made primed responses roughly 59% smaller at the median and decoded all 24
held-out documents byte-for-byte. Acquisition did not break even in the locked
three-page journey: the 64 KiB arm was 11.80% larger than ordinary Brotli and the
128 KiB arm was 55.62% larger. Browser timing and edge configuration were
therefore intentionally not run.

The frozen design and decision rules are in [`PROTOCOL.md`](./PROTOCOL.md).
Generated dictionaries, encoded bodies, and temporary tool sources are ignored;
small manifests and summarized JSON evidence are retained.

Build the pinned native generator from a checkout at the commit named in the
protocol, then run the artifact analysis:

```sh
./experiments/compression-dictionary-transport/scripts/build-generator.sh \
  /path/to/google-brotli
node experiments/compression-dictionary-transport/scripts/analyze.mjs
```

Retained evidence:

- `results/corpus-manifest.json`: the frozen 277-document artifact corpus.
- `results/analysis.json`: per-document, leave-one-out, fixed-dictionary,
  acquisition-journey, toolchain, and gate results.
