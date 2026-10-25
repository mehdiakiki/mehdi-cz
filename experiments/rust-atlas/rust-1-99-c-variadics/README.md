# Rust 1.99 C-variadic function definitions

Evidence for the article [Defining C Variadic Functions in Rust 1.99](https://www.mehdi.cz/blog/defining-c-variadic-functions-in-rust-1-99).

Rust 1.99.0 stabilized C-variadic function definitions ([rust-lang/rust#155697](https://github.com/rust-lang/rust/pull/155697), tracking issue [rust-lang/rust#44930](https://github.com/rust-lang/rust/issues/44930)). This fixture defines a few variadic functions in Rust, builds them as a static library, and calls them from C (gcc and clang) and from Rust. It then records what the compilers check and what they do not.

The library in `src/lib.rs` uses the three usual conventions for telling a variadic function what it received:

- a count: `rv_sum` and `rv_mean`;
- a null pointer at the end: `rv_join_path`;
- a format string: `rv_format` (its own small format) and `rv_cformat` (forwards the `VaList` to the C library `vsnprintf`, with `clone()` for the first, measuring call).

`rv_vsum` takes a `VaList` instead of `...`, so `rv_sum` forwards to it, and a C function forwards its own `va_list` to it. `rv_sum_array` is the same sum with an array and a length, for comparison.

## Toolchains

The committed results were recorded on 2026-10-25 on x86_64 Linux with:

- `rustc 1.98.0 (88d9e12ae 2026-08-18)`, `rustc 1.99.0 (b940084d7 2026-09-28)`, `rustc 1.99.1 (58cf8f9c3 2026-10-13)`;
- `rustc 1.100.0-nightly (923c95cdf 2026-09-16)` with `miri 0.1.0 (923c95cdf5 2026-09-16)`;
- gcc 15.2.1 and clang 21.1.8.

`results/versions.txt` has the exact version lines.

## Run

```bash
./run.sh
```

It needs rustup with the `1.98.0`, `1.99.0`, `1.99.1` and `nightly` toolchains, the `miri` and `rust-src` components on nightly, gcc and clang. Builds go to a temporary directory, and `results/` is rewritten.

Two kinds of output can change on every run. The addresses in `valist-cursor.txt` move with address space randomization, the counters do not. The numbers in `c-misuse-runs.txt` and `rust-misuse-runs.txt` come from undefined behavior, so they mean nothing. Most of them differ between runs, builds and machines. The Rust `rv_sum(4, 1, 2, 3)` printed 6 in every run so far, and that is luck too, not a correct result. They are recorded only to show that nothing stopped those calls.

The Miri messages in `miri.txt` come from the nightly of 2026-09-16. A newer nightly may word them differently.

## Files

| File | What it is |
| --- | --- |
| `src/lib.rs` | the variadic functions, compiled as `rlib` and `staticlib` |
| `src/bin/rust-caller.rs` | calls every function from Rust and prints the same lines as `c/caller.c` |
| `src/bin/cursor.rs` | prints the `VaList` before and after reading a `c_int` and a `c_double` |
| `src/bin/misuse.rs` | wrong calls from Rust: a `double` for `%d`, and a count that is too big |
| `c/varargs.h` | the C declarations; `-DVARARGS_CHECKED` adds the `format` and `sentinel` attributes |
| `c/caller.c` | calls every function from C |
| `c/misuse.c` | wrong calls from C, selected by the first argument |
| `c/typed-misuse.c` | passes a `double` array to `rv_sum_array` |
| `announcement/sum.rs` | the example from the Rust 1.99.0 announcement, unchanged, with a `main` added |
| `errors/*.rs` | definitions and reads that Rust 1.99.1 rejects |

## Results

| File | What it records |
| --- | --- |
| `versions.txt` | toolchain versions and the native libraries for linking the static library |
| `build.txt` | messages from building the library with 1.99.1 and 1.99.0, and from compiling `c/caller.c` with gcc and clang |
| `caller-gcc.txt`, `caller-clang.txt`, `caller-rust.txt` | the output of the three callers, library built with 1.99.1 |
| `caller-compare.txt` | whether each caller and the 1.99.0 builds print the same as the gcc caller |
| `valist-cursor.txt` | the `VaList` fields on x86_64 Linux before and after two reads |
| `announcement-example.txt` | the announcement example on 1.98.0, 1.99.0 and 1.99.1 |
| `errors-1.99.1.txt` | the diagnostic for every file in `errors/` |
| `va-arg-safe-1.99.0.txt` | the `VaArgSafe` bound on 1.99.0 |
| `older-rust-1.98.0.txt` | Cargo 1.98.0 on this package, with and without `--ignore-rust-version` |
| `c-misuse-compile.txt` | gcc and clang on `c/misuse.c` without and with the attributes, and on `c/typed-misuse.c` |
| `c-misuse-runs.txt` | three runs of the `wrong-type` and `short-count` C calls, and one run of the `%ld` call, valid `printf` that `rv_format` does not understand |
| `rust-misuse-runs.txt` | three runs of each wrong Rust call |
| `miri.txt` | nightly Miri on the two wrong Rust calls |

`c/misuse.c` also contains a call without the final null pointer. `run.sh` only compiles it, to record the `sentinel` warning. It does not run it, because the function would read a pointer that the caller never passed.

## Upstream context

- The trait `VaArgSafe`, which limits the types that `next_arg` accepts, was stable together with `VaList` in the stabilization pull request, and was made unstable again before 1.99.0 shipped ([rust-lang/rust#162909](https://github.com/rust-lang/rust/pull/162909), tracking issue [rust-lang/rust#162911](https://github.com/rust-lang/rust/issues/162911)). Reading `c_int` or `c_double` is stable, but writing `T: VaArgSafe` is not. `va-arg-safe-1.99.0.txt` shows that 1.99.0 already rejects it.
- Naked C-variadic functions with other ABIs were stabilized in the same release ([rust-lang/rust#159746](https://github.com/rust-lang/rust/pull/159746)). This fixture does not test them.
- `announcement/sum.rs` keeps the announcement's `SAFETY` comments as they were published.
