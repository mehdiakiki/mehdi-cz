# Five linkers, one ripgrep

Evidence for the article [Linking the Same Rust Binary With Five Linkers](https://www.mehdi.cz/blog/linking-the-same-rust-binary-with-five-linkers).

The experiment builds ripgrep 15.2.0 with Rust 1.99.1, saves the exact link command that rustc runs, and runs only that link step again with seven linker binaries from five projects:

| Name in the results | Linker | Where it comes from | How `cc` is told to use it |
| --- | --- | --- | --- |
| `gnu-ld-2.46` | GNU ld (bfd) 2.46 | system binutils | `-fuse-ld=bfd` |
| `gold-1.16` | GNU gold 1.16 | system binutils 2.46 | `-fuse-ld=gold` |
| `lld-21.1.8` | LLD 21.1.8 | system `ld.lld` | `-fuse-ld=lld` (gcc finds `/usr/bin/ld.lld`) |
| `rust-lld-23.1.1` | LLD 23.1.1 shipped with Rust 1.99.1 | the toolchain | `-B<sysroot>/lib/rustlib/x86_64-unknown-linux-gnu/bin/gcc-ld -fuse-ld=lld`, exactly what rustc passes |
| `mold-2.42.1` | mold 2.42.1, the last C++ version | GitHub release tarball | `-B<mold>/libexec/mold`, a directory whose `ld` is a symlink to mold |
| `mold-3.0.0` | mold 3.0.0, the first Rust version | GitHub release tarball | the same, with the 3.0.0 tarball |
| `wild-0.11.0` | Wild 0.11.0 | GitHub release tarball | `-B out/tools/wild-ld`, a directory whose `ld` is a symlink to wild |

`-B dir` makes gcc look for its programs, including `ld`, in `dir` first. gcc 15 does not know `-fuse-ld=wild`, so `-B` is used for the downloaded linkers. Each output names its linker in `.comment` (gold writes a `.note.gnu.gold-version` note instead, GNU ld writes nothing), and `results/sections-*.txt` lists these names for every output.

Every linker also runs a second time as `<name>/1-thread`: pinned with `taskset -c 2` to one thread of a performance core, and with `-Wl,--threads=1` for LLD, mold and wild. GNU ld and gold already use one thread by default.

## Files

| File | What it does |
| --- | --- |
| `run.sh` | runs everything; `sh run.sh STEP` runs one step |
| `cc-capture` | used as `-C linker=` for the rg crate: writes the arguments to `LINK_ARGS_FILE`, then runs `cc` with them |
| `relink.py` | runs the captured link again with each linker: `time` (interleaved rounds), `pair` (two linkers in alternating order), `perf` (mold 2.42.1 and 3.0.0 with `--perf`), `threads` (processes and threads, with strace), `once` (one output per linker) |
| `summarize.py` | median and range per linker from the timing rows |
| `same-program.sh` | runs every linked `rg` on the same searches over the ripgrep source tree, and asks `addr2line` where `rg::main` is |
| `elfsections.py` | reads ELF section headers, hashes every section, and compares two binaries section by section |
| `rebuild.py` | touches `crates/core/main.rs` and times a whole `cargo` rebuild of `rg` with four linker settings |
| `fuse-ld-order.sh` | builds a hello world three times and prints the `-fuse-ld` options on rustc's link line and the linker named in `.comment` |

## Steps

```sh
HEAVY_LOCK=/path/to/lock sh run.sh        # all steps; HEAVY_LOCK is optional
sh run.sh fetch      # downloads, checks sha256, extracts into out/, cargo fetch into out/cargo-home
sh run.sh versions   # results/versions.txt (also the --fork lines of mold --help and wild --help)
sh run.sh fuse-order # results/fuse-ld-order.txt
sh run.sh build      # dev and release builds, results/link-command-*.txt
sh run.sh time       # results/timing-*.txt, results/timing-*-summary.txt, results/mold-2-vs-3-dev.txt, results/mold-perf-dev.txt
sh run.sh mold-perf  # only results/mold-perf-dev.txt
sh run.sh threads    # results/threads-*.txt
sh run.sh compare    # results/same-program-*.txt and results/sections-*.txt
sh run.sh loop       # results/rebuild-loop.txt
sh run.sh clean      # deletes out/
```

`time` and `loop` take the lock once for the whole session (they run `run.sh timed-session` or `run.sh loop-session` under `flock`). Inside the lock they wait up to four minutes until the 1-minute load average is under 2.0, and then they start; the results file says it if the load stayed higher.

`time`, `threads` and `compare` need the object files that `build` keeps. `loop` rebuilds the rg crate, and a new build can replace these files, so run `build` again before you repeat the other steps. `ROUNDS` (default 20), `PAIRS` (default 40), `PERF_RUNS` (default 10) and `LOOP_ROUNDS` (default 20) set the number of measured rounds. `RESULTS_DIR` writes the results somewhere else, to check a new run against the committed files.

## How the measurement works

- The build uses `cargo rustc --bin rg -- -C linker=cc-capture -C save-temps`. The extra flags apply only to the rg crate. `-C save-temps` keeps the 257 (dev) or 17 (release) object files of the rg crate and rustc's `symbols.o`, which are normally deleted after the link. It also keeps bitcode files, which are deleted because the link does not use them.
- `relink.py` removes `-fuse-ld=...`, the `-B.../gcc-ld` option and `-o` from the captured arguments, adds the options of one linker, and runs `cc`. `build` saves the sha256 of the `rg` that cargo built, and `compare` checks that relinking with rust-lld gives exactly these bytes (last line of `results/same-program-*.txt`).
- `time`: one warm-up round, then 20 rounds. Each round runs all fourteen variants, and the start position rotates by one each round. Before each run the previous output is deleted and `sync` is called, so every run writes a new file and no dirty pages of an earlier run are written back during it. Deleting the file is not measured.
- `pair`: mold 2.42.1 and mold 3.0.0 with default options, 40 pairs after one warm-up pair, in the order AB, BA, AB, ... The summary gives the median of the per-pair differences and how many pairs were slower.
- `perf`: both mold versions with `-Wl,--perf`, which prints the time of each pass of the link, 10 runs each after one warm-up, in alternating order. The table gives the median real time per pass, and `-` when a version has no pass with that name (for example, mold 2.42.1 has no `split_contents` timer). The rows under `copy_chunks` are output sections that are copied in parallel, so their times overlap and do not add up.
- mold and wild fork by default: the parent process exits when the output file is complete, and the child process cleans up after that. `getrusage` in the parent of `cc` does not see that child. So `relink.py` makes itself a child subreaper (`prctl(PR_SET_CHILD_SUBREAPER)`), and after `cc` exits it waits for every process that was reparented to it. The rows show both views: `wall_cc`, `cpu_cc` and `rss_cc` are what a parent that waits for `cc` sees; `wall_all`, `cpu_all` and `rss_all` include the late child. `late` counts the processes that exited after `cc`. The `outputs` column of the summary is the number of different output files (sha256) over all runs of a variant. The summary also counts, for each pair of neighbours in the median order, in how many rounds the faster one really was faster, because both run in the same round.
- Max RSS is `ru_maxrss`. It counts the pages of input and output files that a linker maps into memory, not only the memory it allocates.
- `read_kib` is `ru_inblock` (512-byte blocks that had to be read from storage) of all processes of a run, in KiB. The swap of the laptop was full during the measurements, so this column shows whether memory pressure pushed the input files out of the page cache. The summary prints how many measured runs read anything from storage.
- `threads` runs each variant once under `strace -ff` and counts `clone` calls with `CLONE_THREAD` in the linker processes. The gcc driver and `collect2` are not counted.
- `loop` measures what a developer waits for: `touch crates/core/main.rs`, then `cargo rustc --bin rg` with the default linker (rust-lld), with GNU ld (`-C linker-features=-lld`), with mold 3.0.0 (`-C link-arg=-fuse-ld=mold`, mold's `bin` first in `PATH`) and with wild (`-C linker-features=-lld -C link-arg=-B out/tools/wild-ld`). The four settings are interleaved, the first round is a warm-up, and the `.comment` of the result shows which linker really ran.
- `machine_state` in `run.sh` records `uptime`, `free -m` and `top -bn1 | head -n 15`. In the process lines of `top`, the user name is replaced by `user` and the command by `-`, because they show the other programs of the person who runs it; the CPU and memory columns stay. An earlier version replaced only the last word of the command, so in `timing-dev.txt`, `timing-release.txt` and `rebuild-loop.txt` one program name was replaced afterwards with the same rule.
- `GIT_CEILING_DIRECTORIES` is set because ripgrep's `build.rs` runs `git rev-parse HEAD`. Without it, git finds the repository around `out/src`, and `rg --version` prints that commit. With it, the build prints a warning and `rg --version` shows only `ripgrep 15.2.0`.
- Incremental compilation stays at the cargo default (on for dev). `build` deletes the incremental directory after the build to save disk space; the link does not use it.

## What the mold sources say about the 3.0.0 difference

The `perf` step shows most of the extra time of mold 3.0.0 in the pass `compute_section_sizes`, in two steps named `split_contents` and `resolve_contents`. These steps split mergeable string sections into strings and remove the duplicates. In this ripgrep build, the only merged string sections that are not loaded into memory are `.comment` and the 14 MB `.debug_str` (`results/sections-dev.txt`, last block). The block before it measures the local symbols that mold adds for GOT and PLT entries (names like `bcmp$got`).

- mold 2.42.1, [`src/main.cc`](https://github.com/rui314/mold/blob/v2.42.1/src/main.cc): the comment "Non-allocated merged sections are independent of symbol and relocation processing. Resolve them while the remaining foreground passes run." is followed by a low-priority `tbb::task_group` that resolves these sections in the background, and the driver waits for it after `scan_relocations`.
- mold 3.0.0, [`src/passes.rs`](https://raw.githubusercontent.com/rui314/mold/v3.0.0/src/passes.rs): `compute_section_sizes` has the comment "Merged sections without SHF_ALLOC are resolved here." and resolves them in the foreground.

This is a reading of the two sources next to the `--perf` numbers. The mold 3.0.0 release notes do not mention it. mold 3.0.0 also replaced oneTBB with rayon ([`Cargo.toml`](https://github.com/rui314/mold/blob/v3.0.0/Cargo.toml)).

## Downloads

All into `out/`, nothing outside it, nothing installed:

- `https://github.com/BurntSushi/ripgrep/archive/refs/tags/15.2.0.tar.gz`
- `https://github.com/rui314/mold/releases/download/v2.42.1/mold-2.42.1-x86_64-linux.tar.gz`
- `https://github.com/rui314/mold/releases/download/v3.0.0/mold-3.0.0-x86_64-linux.tar.gz`
- `https://github.com/wild-linker/wild/releases/download/0.11.0/wild-linker-0.11.0-x86_64-unknown-linux-gnu.tar.gz`
- the crates of ripgrep's `Cargo.lock`, from crates.io, into `out/cargo-home`

The sha256 sums in `run.sh` for mold and wild are the digests that GitHub shows for these release assets. GitHub shows no digest for the ripgrep source archive, so its sum is the one of the archive downloaded on 2026-10-25.

## Machine and versions

The committed results were recorded on 2026-10-25 on a laptop with a 12th Gen Intel Core i7-1260P (4 performance cores with 2 threads each, CPUs 0-7, up to 4.7 GHz; 8 efficiency cores, CPUs 8-15, up to 3.4 GHz), Manjaro Linux with kernel 6.6.126, ext4 on NVMe. Other programs were running; each timing file records the load before and after. Exact versions are in `results/versions.txt`: Rust 1.99.1 (rust-lld 23.1.1), gcc 15.2.1, binutils 2.46, LLD 21.1.8, mold 2.42.1 and 3.0.0, Wild 0.11.0, Python 3.14.3, strace 6.19.

The `stable` toolchain on this laptop still pointed to 1.98.0, so `run.sh` asks for `+1.99.1`, the current stable release, explicitly.
