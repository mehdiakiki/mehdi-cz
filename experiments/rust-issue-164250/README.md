# Issue 164250: safe Rust reads a dead value

Evidence for the article [How Safe Rust Read a Dead Value: Issue 164250](https://www.mehdi.cz/blog/how-safe-rust-read-a-dead-value-issue-164250).

[rust-lang/rust#164250](https://github.com/rust-lang/rust/issues/164250) ("struct's lifetime requirements can be bypassed via covariant field assignment") has a program without `unsafe` that keeps a reference to a `String` after the `String` is dropped, and then prints through it. This fixture compiles that program with every Rust toolchain installed on the laptop, looks at what the dead reference points to with gdb, runs it under AddressSanitizer, tests the variants from the issue comments on old standalone Rust releases back to 1.0.0, and uses small companion programs to show where the compiler checks a `T: 'static` bound and where it does not. The fix proposal is [rust-lang/rust#164277](https://github.com/rust-lang/rust/pull/164277) ("require MIR local types to be well-formed"), still open when these results were recorded, so no compiler with the fix was run.

## Programs that are wrong on purpose

The affected compilers accept these programs, although the inferred type of a variable breaks a bound of its struct. Most of them then read dead memory of their own process. `src/static_bound.rs` and `src/bound_unchecked.rs` do not: nothing in them relies on the broken bound.

| File | Source | What it does wrong |
| --- | --- | --- |
| `src/repro.rs` | the issue body, unchanged | `Q<T: 'static + Send>` is built with `None`, then gets `Some(&l)`. Its `Drop` moves the reference into a global list, `l` is dropped, and `main` prints through the dead reference. |
| `src/repro_old.rs` | `src/repro.rs` for compilers older than 1.63 | Same program. The `static Mutex` becomes a `thread_local!` with a `RefCell` (1.60.0 refuses `Mutex::new` in a `static`), and `dyn Any + Send` becomes `Any` (older compilers do not know `dyn`). On 1.0.0 to 1.10.0, `Box<Any>` also needs the old `Reflect` trait, so it does not compile there for a reason that has nothing to do with the bug. On 1.17.0 it is rejected like `src/static_bound.rs`, and from 1.18.0 it is accepted and prints the 32 `X`. |
| `src/static_bound.rs` | comment by theemathas ("compiling ever since 1.18.0") | The smallest form: `Q<T: 'static>` holds a `&String` to a local. The two comment lines inside `drop` were removed, so the body is empty and nothing reads dead memory. |
| `src/lifetime_bound.rs` | comment by theemathas ("compiles since rust 1.4.0") | A `Drop` that relies on `'b: 'a` writes a short-lived `&str` into a longer-lived variable, which `main` prints after the `String` is gone. One blank line with trailing spaces was removed. |
| `src/closure_bound.rs` | comment by maxdexh ("since 1.4") | The bound is `F: FnMut(&T)`. The closure stores the reference into an `Option<&'static _>` that `main` prints after the vector is freed. Unchanged. |
| `src/bound_unchecked.rs` | written for this fixture | `Q<T: 'static>` without a `Drop` impl, built with `None` and then given `Some(&l)`. The type of `q` breaks its bound, but nothing relies on it. |

## Companion programs

`src/covariance.rs` stands alone. Each `src/bound_*.rs` companion differs from `src/bound_unchecked.rs` in one place, and `src/repro_drop_call.rs` differs from `src/repro.rs` by one line. They are compiled with `-A unused`.

| File | Change | Result on 1.99.1 |
| --- | --- | --- |
| `src/covariance.rs` | a `Some("static text")` variable later holds a `&str` to a local `String` | accepted |
| `src/bound_at_construction.rs` | `Q(Some(&l))` instead of `Q(None)` followed by the assignment | rejected, E0597 |
| `src/bound_with_annotation.rs` | `let mut q: Q<&String>` instead of `let mut q` | rejected, E0597 |
| `src/bound_with_drop_call.rs` | an explicit `drop(q)` at the end | rejected, E0597 |
| `src/repro_drop_call.rs` | `src/repro.rs` with `drop(q);` added at the end of the inner block | rejected, E0597 |

## Results

| File | Step | Content |
| --- | --- | --- |
| `results/versions.txt` | `versions` | exact tool versions |
| `results/toolchains.txt` | `toolchains` | `src/repro.rs` with every installed toolchain, debug (no flags) and release (`-O`), and the `write` calls on stdout seen by strace. Stdout goes to a file. The last part runs the 1.81.0 release build again with stdout sent to `/dev/null`. |
| `results/inside-debug.txt` | `inside` | gdb on the 1.99.1 debug build (with `-g`): `l` before it dies, the dead reference during `println!`, and `_z` |
| `results/inside-release.txt` | `inside` | the bytes the 1.99.1 release build prints, the first 32 bytes at `<&&alloc::string::String as core::fmt::Display>::fmt` in the same binary, that symbol and the next one from `nm -n`, and gdb at the start of that function |
| `results/asan.txt` | `asan` | nightly with `-Zsanitizer=address -g`, the full report, and its frames symbolized with `addr2line` (there is no `llvm-symbolizer` on the laptop) |
| `results/companions.txt` | `companions` | the companion programs on 1.99.1 |
| `results/mir.txt` | `mir` | `-Zunpretty=mir` of `main` in `src/repro.rs`, and the borrow checker dump (`-Zdump-mir=main`, file `*.nll.0.mir`) for `src/repro.rs` and `src/repro_drop_call.rs`: the universal regions, the constraints from lines 10 to 12, the borrows and the inferred value of each region named there |
| `results/history.txt` | `history` | the five wrong programs on Rust 1.0.0, 1.3.0, 1.4.0, 1.10.0, 1.17.0, 1.18.0, 1.20.0, 1.40.0, 1.60.0, 1.63.0 and on the installed toolchains, in debug mode with the default edition: accepted or not, the first error and note lines, the exit status and the escaped stdout |
| `results/history-summary.txt` | `history`, or `history-summary` alone | one line per compiler: `yes` when the program compiles, `no` when it is rejected with "`l` does not live long enough", `other` when it does not compile for a reason that has nothing to do with the bug (the old `Reflect` trait, the `dyn` syntax, `Mutex::new` in a `static`). The date is the commit date that `rustc --version` prints, not the release date. |
| `results/flags.txt` | `flags` | `src/repro.rs` on nightly with `-Znext-solver=globally`, `-Zpolonius=next`, `-Zpolonius`, and the new solver with Polonius together |
| `results/github-state.txt` | `github` | the state of the issue, of the fix and of the older implied bounds issue (rust-lang/rust#25860), printed with their titles, and the number of open and closed `I-unsound` issues, read with `gh` |

Addresses change between runs because of ASLR. gdb turns ASLR off and runs with only `PATH` in its environment, so its addresses are stable on one machine. They still depend on `PATH` and on the path of the checkout. The release output of each toolchain is different because each binary has its own code.

## Tool versions

Recorded on the laptop (Linux 6.6.126, x86_64, glibc 2.43):

- rustup toolchains: 1.81.0 (`rustc 1.81.0 (eeb90cda1 2024-09-04)`), 1.88 (`rustc 1.88.0 (6b00bc388 2025-06-23)`), 1.98.0 and stable (`rustc 1.98.0 (88d9e12ae 2026-08-18)`), 1.99.0 (`rustc 1.99.0 (b940084d7 2026-09-28)`), 1.99.1 (`rustc 1.99.1 (58cf8f9c3 2026-10-13)`), beta (`rustc 1.100.0-beta.7 (fd8e211ae 2026-10-17)`), nightly (`rustc 1.100.0-nightly (923c95cdf 2026-09-16)`)
- standalone releases from static.rust-lang.org: the ten versions listed above
- gcc 15.2.1 (the linker driver for every rustc), GNU gdb 17.1, strace 6.19, GNU binutils 2.46 (objdump, nm, addr2line)

## How to run

```sh
sh run.sh            # every step except github
sh run.sh toolchains # one step: versions, toolchains, inside, asan, companions, mir, flags, history, history-summary, github
```

It needs rustup with the toolchains above, gcc, gdb, strace, binutils, curl and GNU tar. The `github` step needs an authenticated `gh` and only reads. When `HEAVY_LOCK` is set to a file, every compiling step runs under `flock` on that file.

## What it downloads

The `history` step downloads, for each old version, `rustc-<version>-x86_64-unknown-linux-gnu.tar.gz` and, from 1.10.0, `rust-std-<version>-x86_64-unknown-linux-gnu.tar.gz` from https://static.rust-lang.org/dist/, checks each file against its `.sha256`, extracts only `rustc/bin/rustc`, `rustc/lib` and the standard library into `out/toolchains/<version>`, and deletes the archive. After testing a version it deletes its directory, and each test binary is deleted after its run. That is 1.11 GB of downloads in total. At the peak, one extracted version takes up to 395 MiB (1.63.0) plus one archive of at most 94 MB. The step stops before a download when less than 4 GiB is free. Nothing is installed with rustup.
