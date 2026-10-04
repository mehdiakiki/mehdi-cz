# PERF-055 — Popularity-bounded prerendering

This isolated experiment measures whether server builds can prerender a bounded
popular subset of content routes and generate the long tail on demand, while
keeping `EXPORT=1` exhaustive.

The frozen arms, ordering, and gates are in [`PROTOCOL.md`](./PROTOCOL.md).
Generated builds and logs live below `work/` and are not retained in source.

## Result

Rejected at the build gates. Across three clean repetitions per arm, the most
aggressive 25-per-family budget reduced median `server/app` bytes by 28.84%
(required: 50%), build wall time by 5.21% (required: 30%), and sampled
process-tree RSS by 0.42% (required: 20%). The 100 and 250 arms also failed all
three economic gates.

The mechanism itself behaved correctly: every selected path was present, every
omitted path stayed out of the concrete prerender manifest, both route families
kept blocking on-demand fallbacks, the sitemap was unchanged, and the newest
blog/Rust artifacts were byte-identical to the control. Because no build arm
passed, runtime, export, browser, and Docker work were intentionally not run.

See [`results/build-sweep-summary.json`](./results/build-sweep-summary.json) for
the medians and per-gate decisions.
