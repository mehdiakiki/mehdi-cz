# Brotli decoder copies

Evidence for the article [The Brotli Bug and the Many Copies of the Decoder on My Laptop](https://www.mehdi.cz/blog/the-brotli-bug-and-the-many-copies-on-my-laptop).

The article is about CVE-2026-111497, an out-of-bounds write in the Google Brotli decoder (affected 1.0.3 through 1.2.0, fixed in 1.0.10, 1.1.1 and 1.2.1). This fixture does four things, none of which gives the real decoder any input:

1. It builds Brotli 1.2.0 and 1.2.1 from source and finds a harmless fingerprint that separates the fixed build from the unfixed one.
2. It looks for copies of Brotli on the machine and records, for each one, how it is linked and whether the fingerprint is present.
3. It reads the same function in two ports, a Go one and a Rust one, before and after their fix releases.
4. It shows the shape of the bug in a tiny toy decoder (my own code and format, not Brotli), first in C and then in Rust.

## What each thing does

| File | What it is |
| --- | --- |
| `fingerprint.c` | Loads `libbrotlicommon.so.1` and `libbrotlidec.so.1` from a directory and prints the version and the error strings for codes -16, -17 and -18. Code -17 is `INVALID` before the fix and `_ERROR_FORMAT_BLOCK_SWITCH` after it. |
| `inventory.sh` | POSIX `sh`. Finds files over 120 KiB that contain the Brotli dictionary in ten tool and system directories, then records for each ELF file its package, its own `NEEDED` Brotli libraries (`readelf -d`), the `BrotliDecoder` functions it imports (`nm -D`), and two texts of the decoder error table. It also lists the direct users of the system decoder, the Go modules, the builds of one program that keeps old versions, and runs `fingerprint` on decoder libraries bundled outside `/usr/lib`. |
| `toy-c/decoder.c` | The toy decoder in C, built with AddressSanitizer. Wrong on purpose, see below. |
| `toy-rust/main.rs` | The same toy in Rust with a three state enum instead of a `bool`. Run it with `match` or `ignore`. |
| `run.sh` | Regenerates every file in `results/`. |

## What the toys do wrong on purpose

The toy format is my own invention. Each input byte is a block switch, and its value is the number of block types. A value of 2 or more is valid and is consumed. A value under 2 is malformed.

- `toy-c/decoder.c`: `take_block()` returns `false` both for "need more input" and for "malformed", so the caller cannot tell them apart. Like the safe path of the real 1.2.0 decoder, the loop reads every `false` as "need more input": it stores the byte in an 8 byte heap buffer and goes on. The input is 20 malformed bytes, so the loop writes past the buffer, and AddressSanitizer stops it at the first byte too far.
- `toy-rust/main.rs`: `match` handles each of the three states and stops on `Malformed`. `ignore` drops the return value, the way the fast path of the real 1.2.0 decoder drops it. The compiler warns (``unused `Step` that must be used``) at build time, and at run time the write into `[u8; 8]` panics with an index out of bounds instead of corrupting memory.

## Results

| File | Source |
| --- | --- |
| `results/fingerprint.txt` | `fingerprint` and the Python `ctypes` check against the 1.2.0 build, the 1.2.1 build and the system `/usr/lib`. |
| `results/system.txt` | The Brotli version that curl and `node` report, the installed `brotli` package, the configured branch, the `brotli` package in `core` of the stable, testing and unstable branches on the configured mirror, and the `ctypes` check on the system library. |
| `results/versions.txt` | For curl and each `node` binary: the Brotli version, the `node:zlib` block-switch constant, and whether the binary has its own `NEEDED` entry for `libbrotlidec`. |
| `results/inventory.txt` | One line per file that contains the dictionary: `needs` is the file's own `NEEDED` Brotli libraries, `imports` the number of imported `BrotliDecoder` functions, `fix` whether the text `_ERROR_FORMAT_BLOCK_SWITCH` is in the file, `table` whether the error string table is in the file at all (`_ERROR_FORMAT_EXUBERANT_NIBBLE`). When `table` is `no`, a missing `fix` text says nothing. |
| `results/shared-users.txt` | Files in `/usr/bin` and `/usr/lib` with their own `NEEDED` entry for `libbrotlidec.so.1`. |
| `results/one-tool-builds.txt` | Every version of one program that is still on disk, oldest first: the runtime version strings inside it and whether the fixed error name is there. |
| `results/go-modules.txt` | The Brotli module inside each Go program from the scan (`go version -m`). |
| `results/bundled-libs.txt` | `fingerprint` on decoder libraries that a program ships next to its own `libbrotlicommon`. |
| `results/ports.txt` | The block-switch function and one caller in Go `andybalholm/brotli` v1.2.0 and v1.2.7 and Rust `brotli-decompressor` 6.1.1 and 6.2.0, with line numbers. |
| `results/c-asan.txt` | The AddressSanitizer report from `toy-c`. |
| `results/rust-run.txt` | `toy-rust match` and `toy-rust ignore`. |
| `results/rust-must-use.txt` | The `#[must_use]` warning from building `toy-rust`. |
| `results/rust-nonexhaustive.txt` | The compile error when a `match` on the three state enum forgets one arm. The compiler's suggestion block is cut (shown with `...`) because it contains a word the repository audit rejects. |

Paths under the home directory start with `DIR`. The program that keeps seven versions under `~/.local/share` is shown as `one-tool/build-N` (numbered in version order, oldest first), and another program there as `another-tool`, so their names are not in the results.

Addresses, process ids and AddressSanitizer build ids change from run to run. The version strings, the error names and the overflow or panic do not. The inventory reflects the programs installed on this laptop, so another machine gives a different list.

## Limits of the scan

It reads ten directories (`/usr/bin`, `/usr/lib`, `/usr/local`, `/opt` and six tool directories in the home directory) and only files over 120 KiB in which the dictionary is stored as plain bytes. It does not look in `/var` (system flatpak apps), inside compressed files (AppImages, jars), or in project folders such as `node_modules`. The users of the shared library are listed separately in `shared-users.txt`, and only for direct links. `ldd` is not used, because it also lists libraries that come in through other libraries (the system decoder comes in through `libfreetype.so.6` for many programs) and because `ldd` can run the program in some cases (see ldd(1)).

## How to run

```sh
sh run.sh            # everything
sh run.sh fingerprint
sh run.sh toys
sh run.sh system
sh run.sh ports
sh run.sh inventory
```

Heavy steps (the two cmake builds, the toy compiles, the directory scan) run under `flock "$HOME/Documents/story-scratch/heavy.lock"` when that lock file exists. Override the path with the `STORY_LOCK` environment variable.

## What it downloads

Into `out/` (git-ignored), only when missing:

- `https://github.com/google/brotli/archive/refs/tags/v1.2.0.tar.gz` and `.../v1.2.1.tar.gz`
- `https://raw.githubusercontent.com/andybalholm/brotli/v1.2.0/decode.go` and `.../v1.2.7/decode.go`
- `https://static.crates.io/crates/brotli-decompressor/brotli-decompressor-6.1.1.crate` and `...-6.2.0.crate`

SHA-256 of the Brotli tarballs used here:

```text
816c96e8e8f193b40151dad7e8ff37b1221d019dbcb9c35cd3fadbfe6477dfec  brotli-1.2.0.tar.gz
98d35d11a78dc453aebb7d10c3748f3f73ff78c8267c0dc697b8631f67bf7e8f  brotli-1.2.1.tar.gz
```

The `system` step also reads three directory listings (`core/x86_64` of the stable, testing and unstable branches) from the first server in `/etc/pacman.d/mirrorlist`. Nothing is uploaded. The downloaded sources are only searched with `grep`, never built or run, except the two Brotli versions, which are built and loaded by `fingerprint`.

## Tool versions

Recorded on 2026-10-25 on Manjaro Linux, kernel 6.6.126:

- gcc 15.2.1
- cmake 4.2.3
- rustc 1.100.0-nightly (923c95cdf 2026-09-16), edition 2021
- Python 3.14.3 (for the `ctypes` check)
- curl 8.18.0
- Brotli sources v1.2.0 and v1.2.1
- system `brotli` package 1.2.0-1 (built 2026-01-03)
- `/usr/bin/node` from the distro `nodejs` package 25.6.1-1; downloaded `node` v22.4.1, v22.23.1 and v26.12.1 under nvm
