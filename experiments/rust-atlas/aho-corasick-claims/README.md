# Aho-Corasick claim lab

This fixture verifies deterministic claims used by the Rust Atlas Aho-Corasick article cluster.

```bash
cargo test --locked --offline --manifest-path experiments/rust-atlas/aho-corasick-claims/Cargo.toml
```

The exact dependency is locked to `aho-corasick` 1.1.5. The tests cover chunk partition invariance,
match-kind results, explicit DFA selection, semantic equivalence with prefilters toggled, dense
overlapping output, UTF-8 byte boundaries, and sharing one compiled matcher across threads.

Performance hypotheses are intentionally not assigned pass/fail thresholds here. They depend on
the CPU, target features, automaton kind, pattern corpus, haystack distribution, chunk schedule,
and result consumer. Their Atlas records define what must be measured and what would falsify the
claim instead.
