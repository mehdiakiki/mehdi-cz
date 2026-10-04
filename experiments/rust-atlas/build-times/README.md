# Rust build-time diagnosis lab

Synthetic Cargo workspaces used by the compile-time diagnosis cluster. Every number quoted in
those articles comes from one of the commands below. No external crate is used, so everything
runs with `--offline`.

Toolchain used for the recorded numbers:

```
rustc 1.95.0-nightly (3a70d0349 2026-02-27)
cargo 1.95.0-nightly (f298b8c82 2026-02-24)
x86-64 Linux, 16 logical cores
```

## Layout

| Path | What it is |
| --- | --- |
| `generate.py` | Writes every workspace below. Run it before measuring. |
| `measure.py` | Times the build scenarios and reports which crates Cargo recompiled. |
| `dirty-reasons.sh` | Reproduces six rebuild triggers and prints Cargo's fingerprint log. |
| `timings.py` | Summarises a `cargo build --timings` report into a per-unit table. |
| `diag/` | Three tiny crates, one build script, one feature, one `option_env!` read. |
| `split-1/` | 12 generated modules inside one library crate. |
| `split-3/` | The same 12 modules in three library crates. |
| `split-12/` | The same 12 modules in twelve library crates. |

`split-*` all contain the same code. Only the crate boundaries move. Each module instantiates
8 generic types of its own plus 16 types declared in `shared`, so the number of crates changes
how many times the generic body in `shared` is monomorphized.

`target/` directories are build output. Do not add them to version control.

## Regenerate the workspaces

```bash
cd experiments/rust-atlas/build-times
python3 generate.py
```

`measure.py` regenerates automatically, because its scenarios edit source files on purpose.

## Build-time scenarios

```bash
python3 measure.py all -j 16     # cold, no-op, leaf edit, root edit, plus rebuild triggers
python3 measure.py split -j 1    # the same split comparison with no parallelism
```

Wall time is the median of three runs, cold builds included. CPU time is user plus system time
of the child processes, so it shows total work rather than work divided by cores. The bracketed
list at the end of each line is the crates Cargo actually recompiled.

Recorded results, `-j 16`:

```
split-1  cold 5.69 s wall /  5.80 s cpu      split-1  edit leaf module 4.97 s
split-3  cold 3.55 s wall /  9.76 s cpu      split-3  edit leaf module 2.21 s
split-12 cold 4.13 s wall / 39.13 s cpu      split-12 edit leaf module 1.18 s
```

Recorded results, `-j 1`:

```
split-1  cold  5.71 s
split-3  cold  7.28 s
split-12 cold 14.36 s
```

`split-1` takes the same time under both job counts because its chain is `shared` then `app`,
so the extra cores have nothing to run.

## Count the monomorphized instances

```bash
for v in split-1 split-3 split-12; do
  (cd $v && cargo build --offline)
  echo "$v: $(nm --defined-only $v/target/debug/app | grep -c '9transform')"
done
```

Recorded: 112, 144, 288.

## Read the build schedule

```bash
python3 timings.py split-3
```

This runs `cargo build --timings` on a clean target directory and parses the `UNIT_DATA` array
out of the generated HTML. The recorded `split-3` schedule shows `app lib` starting at 0.61 s
while `part02 lib` is still in codegen until 3.43 s, and a link unit of 0.08 s out of a 3.51 s
build. Across the three variants the link unit was 1.4 to 2.3 percent of the build.

## Rebuild triggers and their fingerprint log lines

```bash
bash dirty-reasons.sh
```

Six independent steps, each starting from a freshly generated `diag/` and one warm build:

1. Source file edited in the leaf crate.
2. `RUSTFLAGS` changed, then repeated, then switched back.
3. Feature set changed by the command (`cargo build` then `cargo build -p core-a`).
4. Profile changed (`opt-level` 0 to 1 in `[profile.dev]`).
5. `DIAG_TAG` changed, which `core-a` reads through `option_env!`.
6. `core-b/schema/table.txt` deleted while `build.rs` still declares
   `cargo::rerun-if-changed=schema/table.txt`.

The script uses `$HOME/.cargo/bin/cargo` directly. A shell wrapper that summarises Cargo output
will otherwise swallow the `CARGO_LOG` lines. Override with `CARGO_BIN=/path/to/cargo`.

## Compiler phases inside one crate

```bash
cd split-1
cargo rustc --offline -p app --lib -- -Ztime-passes
```

Recorded (one run, not a median): total 5.167 s, of which `LLVM_passes` 4.027 s,
`codegen_crate` 0.784 s, `monomorphization_collector_graph_walk` 0.300 s,
`type_check_crate` 0.008 s.

`-Ztime-passes` and `-Zself-profile` are both nightly only. Stable rustc 1.98.0 answers
`the option 'Z' is only accepted on the nightly compiler`.
