# Async symptoms lab

This fixture reproduces the measurements behind the async Rust article cluster
(pillar: "How Async Rust Works Under the Hood: Five Symptoms, One Model").

```bash
cargo test --locked --offline --manifest-path experiments/rust-atlas/async-symptoms/Cargo.toml
cargo run --release --manifest-path experiments/rust-atlas/async-symptoms/Cargo.toml --bin size
```

Binaries: `size` (future layout), `blocking` (one blocking call stalls a worker),
`select_loss` (select! drops partial progress), `shutdown` (what a runtime can and
cannot cancel), `send_ok` (the Send fix), `dyn_cost` (async fn in dyn trait, measured),
`async_drop` (cleanup when Drop cannot await). `compile-fail/send_fail.rs` is kept as
plain text because it must not compile.

Timing numbers depend on the machine. The tests pin only the deterministic claims:
future sizes and the select! loss counts under paused tokio time.
