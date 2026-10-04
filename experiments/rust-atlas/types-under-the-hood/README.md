# Types under the hood: the Human and u8 experiments

Source files behind the pillar article "What Is a Type? A Set of Values, a Promise
About Operations, or Both". The same two-value type is compiled in TypeScript,
Rust, and C, and the outputs are compared.

```bash
sh experiments/rust-atlas/types-under-the-hood/run.sh
```

Needs the repository's TypeScript (`node_modules/.bin/tsc`), `rustc`, and `gcc`.
Recorded with TypeScript 5.9.3, rustc 1.95.0-nightly (2026-02-27), GCC 15.2.1 on
x86-64 Linux. Sizes, byte values, compiler errors, and the shape of the assembly
are deterministic. Label names in the assembly (`.Lanon...`, `.LC0`) vary.

Article 2, "Does a Type Exist at Runtime?", uses `age.rs` (HIR, MIR, LLVM IR, and
assembly snapshots of one `u8` increment, debug and release), `age_run.rs` (the
overflow guard seen from a running program) and `age_tests.rs` (the same test file
passes as a debug build and as a release build). `-Z unpretty=hir` needs a nightly
rustc; everything else works on stable.
