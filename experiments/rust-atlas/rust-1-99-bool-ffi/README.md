# Rust 1.99.0 bool FFI return on x86_64

Evidence for the article [How Rust 1.99.0 Returned 16 for false](https://www.mehdi.cz/blog/how-rust-1-99-0-returned-16-for-false).

Rust 1.99.0 compiled `extern "C"` functions that return `bool` for x86_64 System V targets other than Apple, like x86_64 Linux, without the `zeroext` attribute on the return value, so the function could leave bits 1 to 7 of `%al` dirty. C callers then saw values like 16 where Rust computed `false`. The bug was reported in [rust-lang/rust#163911](https://github.com/rust-lang/rust/issues/163911), fixed in [rust-lang/rust#163917](https://github.com/rust-lang/rust/pull/163917), and shipped in [Rust 1.99.1](https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/) on 2026-10-15.

`src/lib.rs` has three functions:

- `rust_fn_returning_bool`, the function from the issue, unchanged;
- `rust_fn_returning_bool_u32`, the same check on a `u32`, used to show a wrong C prototype;
- `rust_fn_returning_u8`, the same check returning `u8`, the workaround for 1.99.0.

The crate is built as a static library with Rust 1.98.0, 1.99.0 and 1.99.1, in the `dev` profile (labelled `debug` in the results) and the `release` profile. Every C program is compiled with gcc and clang at `-O0`, `-O1` and `-O2` and linked against each of the six libraries, so every C results file has 36 blocks. The inputs `0x00` and `0x01` are the values a normal test uses. `0x10` and `0x11` set a bit that the function must ignore.

Run everything with:

```bash
./run.sh
```

It needs x86_64 Linux, rustup with the `1.98.0`, `1.99.0` and `1.99.1` toolchains, gcc, clang and GNU objdump (for `--disassemble=<symbol>`). There are no crate dependencies. `run.sh` builds in a fresh `mktemp -d` directory, which it leaves in place, and rewrites `results/`.

The committed results were recorded on 2026-10-25 with `rustc 1.98.0 (88d9e12ae 2026-08-18)`, `rustc 1.99.0 (b940084d7 2026-09-28)`, `rustc 1.99.1 (58cf8f9c3 2026-10-13)`, gcc 15.2.1, clang 21.1.8 and GNU objdump 2.46. `results/versions.txt` has the full version output.

| File | What it shows |
| --- | --- |
| `results/repro-matrix.txt` | `c/repro.c`: the byte in `%al` and what `(int)ret` prints, for every Rust library and C build |
| `results/c-side.txt` | `c/uses.c`: which branch `if (ret)`, `if (!ret)` and `if (ret == true)` take, and the values of `(int)ret`, `!ret`, `!!ret` and `ret & 1` |
| `results/c-caller-asm.txt` | the gcc and clang code for every check in `c/uses.c` |
| `results/asm-rust_fn_returning_bool.txt` | `objdump -d` of the function from the issue, per toolchain and profile |
| `results/asm-rust_fn_returning_bool_u32.txt` | the same for the `u32` variant |
| `results/asm-rust_fn_returning_u8.txt` | the same for the `u8` workaround |
| `results/llvm-ir.txt` | the three functions from `--emit=llvm-ir`, per toolchain and profile |
| `results/clang-caller-ir.txt` | how clang declares the function on the C side |
| `results/wrong-prototype.txt` | `c/wrong_prototype.c`: a C header that says `int` for the Rust `bool` return of the `u32` variant |
| `results/right-prototype.txt` | `c/right_prototype.c`: the same calls with the correct `bool` prototype |
| `results/u8-workaround.txt` | `c/u8_workaround.c`: the `u8` workaround |
| `results/rust-caller.txt` | `rust-caller/main.rs`: a Rust caller from each toolchain, at `opt-level` 0 and 3, linked against the function compiled by each toolchain |
| `results/rust-caller-ir.txt` | how each toolchain declares the function on the Rust caller side |
| `results/rust-caller-asm.txt` | each call to the function in the Rust callers from `--emit=asm` at `opt-level` 3, with the instruction after it |
| `results/versions.txt` | toolchain and compiler versions |

Notes:

- `c/repro.c` declares the function a second time with an `unsigned char` return through a GCC/Clang asm label. This reads `%al` as a plain byte, without any `bool` assumption from the C compiler.
- In `results/wrong-prototype.txt`, the blocks with a Rust `debug` library and a C build other than gcc `-O0` print bits that the caller left in `%eax`. These numbers change from one run to the next. The `release` blocks are stable.
- For `results/rust-caller.txt`, the function is compiled with `rustc -C opt-level=3 --emit=obj` and linked into the caller as an object file, so the two Rust standard libraries never meet.
- The upstream codegen test for this attribute, `tests/codegen-llvm/some-abis-do-extend-params-to-32-bits.rs`, compiled its x86_64 case for `x86_64-unknown-uefi` in 1.99.0. That target is Windows-like for rustc, so its `extern "C"` functions use the Windows x64 code in `rustc_target`, not the System V code used on Linux. The fix added an `x86_64-unknown-linux-gnu` case. Windows-like targets and Apple targets kept the extension of `bool` returns in 1.99.0.
