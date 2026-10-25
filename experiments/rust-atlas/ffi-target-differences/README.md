# FFI and target differences

This fixture backs the article "Why Does My Rust Program Behave Differently on
Another Target?" (`/blog/why-does-my-rust-program-behave-differently-on-another-target`).

It shows, with real compiler and loader output, how the same Rust source or the
same binary changes between targets and machines:

- what `rustc --print cfg` assumes for ten targets, without a machine of that target;
- the C data model of nine targets (`c_char`, `c_long`, `usize`, alignments,
  a `repr(C)` struct size, byte order), computed by rustc in const context and
  read back from the object file, so nothing runs on the foreign target;
- which x86_64 Linux assumptions `cargo check --target` catches, in a crate that
  leaves them implicit and in a crate that names them;
- Relaxed and Acquire/Release atomics in x86_64 and aarch64 assembly;
- the x86_64 `bool` return regression of Rust 1.99.0
  ([rust-lang/rust#163911](https://github.com/rust-lang/rust/issues/163911),
  fixed in [Rust 1.99.1](https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/)),
  compared with 1.98.0 and 1.99.1;
- a binary built for `x86-64-v4` running on a CPU without AVX-512, so this
  laptop plays the role of the older machine;
- a glibc binary, a static musl binary and an aarch64 binary started on this
  machine and in Alpine 3.22, Debian 11 (glibc 2.31) and Debian 12 (glibc 2.36);
- std services on `wasm32-unknown-unknown`, run by node;
- `long labs(long)` declared with `i64`, run as x86_64 and as i686;
- the cast patches that hide the type errors (`as *const i8`, `x as c_long`),
  checked for three targets and run as x86_64 and as i686;
- a `printf` call through the variadic declaration and through a fixed one,
  on x86_64 Linux, aarch64 Linux and aarch64 macOS.

## Machine and toolchains

The results were produced on 2026-10-25 on:

- x86_64 Manjaro Linux, kernel 6.6, 12th Gen Intel Core i7-1260P (AVX2, no AVX-512);
- glibc 2.43, with the 32-bit glibc installed (`gcc -m32` works), used to link
  and run the i686 binaries;
- `rustc 1.99.1 (58cf8f9c3 2026-10-13)`, LLVM 23.1.1, and `cargo 1.99.1`;
- `rustc 1.99.0` and `rustc 1.98.0` for the `bool` probe only;
- gcc 15.2.1 as the linker driver. For the two gnu targets rustc calls `cc`
  with `-fuse-ld=lld` and the `gcc-ld` directory of the toolchain, so the
  linker itself is LLD: the `.comment` section of the binaries says
  `Linker: LLD 23.1.1` (recorded in `results/loader.txt`). The x86_64 musl
  binary goes through plain `cc`, and `rust-lld` links the aarch64 musl binary;
- node v22.4.1 for the wasm module;
- docker 29.2.1 with `alpine:3.22`, `debian:bullseye-slim` and
  `debian:bookworm-slim` (pulled once if missing, run with `--network none`).

`results/toolchain.txt` records the exact versions of each run.

Targets for the 1.99.1 toolchain (all of them installed, none was skipped):

```bash
rustup target add --toolchain 1.99.1 \
  aarch64-unknown-linux-gnu i686-unknown-linux-gnu x86_64-pc-windows-msvc \
  aarch64-apple-darwin wasm32-unknown-unknown thumbv7em-none-eabi \
  s390x-unknown-linux-gnu powerpc64-unknown-linux-gnu \
  x86_64-unknown-linux-musl aarch64-unknown-linux-musl
```

`aarch64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`, `aarch64-apple-darwin`,
`thumbv7em-none-eabi`, `s390x` and `powerpc64` are only compiled and checked,
never linked or run. The aarch64 binary that is linked uses
`aarch64-unknown-linux-musl`, and it does not run on this machine. The two crates in `assumptions/`
have no dependencies; their `Cargo.lock` files are committed and the checks run
with `--offline --locked`.

## Run

```bash
./run.sh
```

It builds everything in a directory from `mktemp -d` and rewrites `results/`.
The results use four placeholders: `$WORK` for that directory, `<pid>` for a
process id, `<fixture>` for the path of this fixture in Cargo output, and
`<time>` for the build time that Cargo prints. Two runs on this machine gave
byte-identical results (compared with `cmp`).

Some values can change between runs or machines:

- the docker image ids and the Debian package versions (for example
  `2.31-13+deb11u14`) after an image update;
- the `native` line, the CPU flags and the x86-64 levels of the loader on
  another CPU. On a CPU with AVX-512 the `x86-64-v4` binary runs normally, so
  `results/cpu-level.txt` will differ there;
- the kernel, glibc, gcc, node and docker versions in `results/toolchain.txt`,
  and the libc symbol addresses in `results/loader.txt` and
  `results/labs-i64.txt` after a glibc update.

On a host without 32-bit glibc the i686 part fails to link.

## Files

- `probes/data_model.rs`: no_std library; writes one line of C data-model facts
  into a static byte array, computed in const context for the target.
- `assumptions/implicit/`: a small library with x86_64 Linux assumptions in its
  types (`*const i8`, `labs(i64)`, `u64::from_ne_bytes`, `AtomicU64`,
  `std::os::unix`) and one layout assertion.
- `assumptions/named/`: the same library with the assumptions written as
  `c_char`, `c_long`, `from_le_bytes`, explicit encoding, `cfg(unix)` and a
  `compile_error!` for missing 64-bit atomics.
- `probes/orderings.rs`: one atomic load and store with weak and strong orderings.
- `probes/bool_return.rs`: the exported `bool` function from rust-lang/rust#163911.
- `probes/cpu_level.rs`: a `u64` dot product the compiler vectorizes, plus
  `is_x86_feature_detected!` for `avx2` and `avx512f`.
- `probes/hello.rs`: hello world for the loader runs.
- `probes/wasm_os.rs` and `probes/run_wasm.mjs`: a `wasm32-unknown-unknown`
  cdylib that calls `std::fs::read`, `thread::Builder::spawn` and
  `SystemTime::now`, and the node script that runs it with no imports.
- `probes/labs_i64.rs`: `labs` declared with `i64` in place of `c_long`.
- `probes/cast_patches.rs`: `puts` and `labs` called through casts
  (`as *const i8`, `x as c_long`); built as a library for the checks and as a
  binary for the runs.
- `probes/variadic_ok.rs` and `probes/variadic_fixed.rs`: `printf` declared with
  `...` and with a fixed `c_int` parameter. They are separate crates: with both
  declarations in one crate, x86_64 at opt-level 2 emitted one merged function
  for the two calls, so that comparison showed nothing.

## Results

- `toolchain.txt`: versions of rustc, cargo, glibc, gcc, node, docker, and the CPU.
- `cfg-raw.txt`: `rustc +1.99.1 --print cfg --target <t>` for ten targets.
- `cfg-summary.txt`: one line per target from that output.
- `data-model.txt`: the table written by `probes/data_model.rs` for nine targets.
- `cargo-check-implicit.txt`, `cargo-check-named.txt`: `cargo check --target <t>`
  per target, short message format.
- `cargo-check-named-thumbv7em-full.txt`: the first full error of the named
  crate on `thumbv7em-none-eabi`.
- `cargo-check-named-matrix.txt`: one `cargo check` with eight `--target` flags.
- `atomics-asm.txt`: function bodies from `--emit=asm` for x86_64 and aarch64.
- `bool-return-asm.txt`: the `bool` function with 1.98.0, 1.99.0 and 1.99.1 at
  opt-level 0 to 3.
- `cpu-level.txt`: CPU flags, the meaning of `native`, the x86-64 levels that
  `/lib64/ld-linux-x86-64.so.2 --help` marks as supported, feature counts, the
  instructions of the hot loop, and each build run on this machine.
- `loader.txt`: `file`, the interpreter, the glibc symbol versions, the two
  versions of `__libc_start_main` in `/usr/lib/libc.so.6`, the linker named in
  `.comment`, the binfmt_misc entries, and the runs on this machine and in the
  three containers.
- `wasm-os.txt`: what node printed for the wasm module.
- `labs-i64.txt`: the `labs` runs at opt-level 0 and 2, with the LLVM IR call
  lines, the wrong i686 value in hex, and the code of `labs` in the 32-bit glibc.
- `cast-patches.txt`: the cast patches compiled for aarch64 Linux, Windows x64
  and i686 (no warning is printed), and run as x86_64 and i686.
- `variadic-asm.txt`: the two `printf` calls on three targets.

## Upstream references

- Rust 1.99.1 announcement, which lists the `bool` return fix:
  https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/
- rust-lang/rust#163911, "Miscompilation with FFI bool return type on x86_64",
  opened 2026-10-07, closed 2026-10-14:
  https://github.com/rust-lang/rust/issues/163911
- Rust 1.99.0 announcement, which stabilizes defining C-variadic functions:
  https://blog.rust-lang.org/2026/10/01/Rust-1.99.0/
- Platform support (glibc 2.17+ for `x86_64-unknown-linux-gnu`):
  https://doc.rust-lang.org/rustc/platform-support.html
- `target_has_atomic_primitive_alignment` and the 32-bit x86 example:
  https://doc.rust-lang.org/reference/conditional-compilation.html
- Undefined behavior of unsupported target features on x86:
  https://doc.rust-lang.org/reference/attributes/codegen.html
- `is_x86_feature_detected!` expands to `true` for features enabled at compile time:
  https://doc.rust-lang.org/std/arch/macro.is_x86_feature_detected.html
- Apple arm64 ABI (signed `char`, variadic arguments on the stack):
  https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms
- Strongly and weakly ordered hardware: https://doc.rust-lang.org/nomicon/atomics.html
- `"C"` and `"C-unwind"` at a panic: https://doc.rust-lang.org/reference/items/functions.html#unwinding
- ENOEXEC "is for the wrong architecture": https://man7.org/linux/man-pages/man2/execve.2.html
- binfmt_misc and foreign-architecture emulation: https://docs.kernel.org/admin-guide/binfmt-misc.html
- Default (`@@`) and old (`@`) symbol versions: https://sourceware.org/binutils/docs/ld/VERSION.html
- `%al` in variadic calls on x86-64: https://gitlab.com/x86-psABIs/x86-64-ABI
