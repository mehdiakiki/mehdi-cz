# Build script contract

Evidence for the article [What a Build Script Can Tell Cargo, and What It Cannot](https://www.mehdi.cz/blog/what-a-build-script-can-tell-cargo-and-what-it-cannot).

A Cargo build script talks to Cargo only through lines on its standard output. This workspace sends every important kind of line and records who receives it: rustc for the same package, the build script of a direct dependent, the linker, the terminal, or nobody. It also shows the things a build script cannot do (enable a feature, add a dependency, give a cfg or an environment variable to another crate, pass compiler flags), the host versus target trap, and the stale result of an input that the script reads without declaring it.

The committed results were recorded on 2026-10-25 on x86_64 Linux with:

- `rustc 1.99.1 (58cf8f9c3 2026-10-13)` and `cargo 1.99.1 (5f94df478 2026-08-27)`
- the `thumbv7em-none-eabi` target for Rust 1.99.1
- `cc` = GCC 15.2.1, GNU ar 2.46, and `nm` from GNU Binutils

## Run it

```bash
rustup target add --toolchain 1.99.1 thumbv7em-none-eabi
./run.sh
```

`run.sh` copies the workspace into a directory from `mktemp -d` and runs every build there, so the checkout is never modified and no `target/` appears here. Then it rewrites `results/`. In the results, the temporary workspace path is replaced with `WS`, the home directory with `~`, and Cargo's 16-digit hashes with `HASH`. Build times, file modification times and the name of one rustc object file change from run to run, the rest is stable.

A plain `cargo build` at the root builds only the default members. Some members fail on purpose and are built only by `run.sh`.

## Packages

| Package | What it does |
| --- | --- |
| `answer-sys` | `links = "answer"`. Its build script compiles `native/answer.c` with `cc` and `ar` into a static library in `OUT_DIR`, and emits `rustc-link-search`, `rustc-link-lib`, `rustc-link-arg`, `rustc-check-cfg`, `rustc-cfg`, `rustc-env`, `metadata` and `warning`. It reads `CC` and `AR` and declares both with `rerun-if-env-changed`. When the compiler cannot start, it emits `cargo::error`. |
| `app` | Depends on `answer-sys`. Its build script reads `DEP_ANSWER_VERSION` and emits its own cfg, a `rustc-env` and a `rustc-link-arg`. The binary prints what each crate can see. It uses `cfg!(answer_version = "2")` on purpose, so its build prints an `unexpected_cfgs` warning: that name exists only in `answer-sys`. |
| `where-it-runs` | A `no_std` library. Its build script prints `cfg!` values next to the `CARGO_CFG_TARGET_*` values, and makes the same pointer-width decision both ways. |
| `undeclared-input` | Its build script reads `../shared/greeting.txt` and `GREETING_STYLE` and declares neither. |
| `declared-input` | The same build script with `rerun-if-changed` and `rerun-if-env-changed` for both inputs. |
| `fake-feature`, `helper` | `fake-feature` has an optional dependency on `helper` behind the feature `extra`. Its build script prints `cargo::rustc-cfg=feature="extra"`. The build fails on purpose. |
| `echo-line` | Its build script prints the line given in `BUILD_LINE`, to test one instruction at a time. |
| `old-msrv` | The same as `echo-line`, with `rust-version = "1.76"`. Its own rerun line uses the old `cargo:` syntax. Because of this package, Cargo writes the lockfile in version 3. |

## Results

| File | What it shows |
| --- | --- |
| `results/toolchain.txt` | compiler, Cargo, C compiler and archiver versions, and the installed `thumbv7em-none-eabi` target |
| `results/contract.txt` | the build of `app`, the rustc flags Cargo passed to `answer_sys` and to `app`, the output of `app` under `cargo run` and started directly, the link-arg symbols in the binary, and the members of the `answer-sys` rlib |
| `results/cargo-error.txt` | `CC=no-such-cc`: the rerun because `CC` changed, and the `cargo::error` that fails the build |
| `results/single-lines.txt` | `cargo::feature=extra`, `cargo:feature=extra`, `cargo::rustc-flags=-C opt-level=3`, and the `cargo::` syntax with `rust-version = "1.76"` |
| `results/fake-feature.txt` | the faked feature cfg: rustc gets `--cfg feature="extra"` but no `--extern helper`, then the same package with `--features extra` |
| `results/host-vs-target.txt` | `cargo check` of `where-it-runs` for the host and for `thumbv7em-none-eabi`, with the cfg flags rustc received |
| `results/hidden-inputs.txt` | the undeclared and declared packages after a file change, after an environment change, and after touching an unrelated file |

## Sources

- The Cargo book: [Build scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html), [Build script examples](https://doc.rust-lang.org/cargo/reference/build-script-examples.html) and [Environment variables](https://doc.rust-lang.org/cargo/reference/environment-variables.html#environment-variables-cargo-sets-for-build-scripts).
- The rustc book: [Cargo specifics of check-cfg](https://doc.rust-lang.org/rustc/check-cfg/cargo-specifics.html).
- "the precalculated components changed" is the dirty reason for a build script without any `rerun-if` line. Cargo then uses the modification time of the newest file in the package, see the comments in [`src/compiler/fingerprint/mod.rs`](https://github.com/rust-lang/cargo/blob/5f94df4789f005f9a352888e8355ffc645b7ed0e/src/compiler/fingerprint/mod.rs) at the Cargo 1.99.1 commit.
