# From source to a running process: experiments

Small C and Rust programs that follow a program from the compiler to the end of the
process. Each part of the series has a directory `pNN/` with its sources and a `run.sh`.
The outputs quoted in the articles are saved in `results/pNN-*.txt`.

## How to run

```sh
sh run.sh        # all twenty parts
sh run.sh 7      # part 7 only
RESULTS=results sh run.sh 7   # write into results/ instead of out/results/
```

Build products and temporary files go to `out/pNN/` (ignored by git). By default the
result files go to `out/results/`, so a run does not overwrite the saved results. `RUSTC`
selects the Rust compiler (default `rustc +1.98.0`). Nothing needs root or the network.

Needed tools: gcc, GNU binutils (readelf, objdump, nm, ld), glibc with static libraries,
rustup with the 1.98.0 toolchain, strace, gdb, python3, taskset, `script` from util-linux,
the system LLD (`ld.lld`, used by parts 4 and 6), and `pacman` for one line of part 6
(on a system without it, that line prints nothing and the script continues).

## Machine and versions of the saved results

- Linux 6.6.126-1-MANJARO, x86-64, Intel Core i7-1260P: CPUs 0 to 7 are the four
  performance cores with two threads each, CPUs 8 to 15 the efficiency cores
- gcc 15.2.1, GNU ld and objdump 2.46, glibc 2.43
- rustc 1.98.0 (88d9e12ae 2026-08-18), which links with its own rust-lld (LLD 22.1.8)
- strace 6.19, gdb 17.1, Python 3.14.3, util-linux 2.41.3

## Things to know about the results

- Addresses and process ids change on every run (address randomization). Timing numbers
  change too, and they depend on the other processes of the machine. Where it matters, the
  result files record `uptime` or the busiest processes. Timing runs are pinned with
  `taskset`: CPU 2 is a performance core and CPU 10 an efficiency core; part 19 uses CPU 4.
  Other experiments ran on the same laptop the evening when these results were saved,
  some of them pinned to CPU 2.
- Paths of the build directory are removed or replaced by `DIR` with `sed` in parts 1, 4,
  7, 8, 10 and 12. In part 1 this includes the path that `readlinkat` returns in the strace
  of the static program, and in part 4 the paths in the linker command that rustc prints.
  A temporary object path in the linker output of part 6 becomes `whoami.o`. Part 6 also
  removes the BuildID from the output of `file`.
- `p01-startup-alone.txt` and `p06-startup-alone.txt` are not new measurements: `run.sh`
  extracts the "each program alone" lines of the startup time files into one table.
- Parts 6, 9, 18 and 20 crash programs on purpose and set `ulimit -c 0`. On this machine
  `kernel.core_pattern` sends crashes to systemd-coredump, so strace still prints
  "core dumped".
- Part 13 touches 1 GiB of memory. Part 14 forks parents with up to 2 GiB, and skips the
  2 GiB case when `MemAvailable` is below 6,000,000 kB.
- Part 20 runs programs under `script` to give them a terminal, and removes the carriage
  returns of the terminal with `tr -d '\r'`.
- `p18-strace-main.txt` and `p19-rust-dtor.txt` were saved by running only their block
  of `run.sh`, with the binaries built by the run that saved the other files of the part.
  `p03-static-sizes.txt`, `p17-empty-function.txt` and `p18-strace-madvise.txt` were added
  later in the same way, with the binaries of the second full run described below (the two
  files of part 3 were rebuilt with the commands of `run.sh`).
- The files that end with `-run2.txt` are copies of outputs of a second full run of
  `run.sh`, between 23:29 and 23:31 local time, a few hours after the other saved results. During this run another CPU-bound program, which is not part of this
  fixture, ran on CPU 2: the `ps` lines of `p19-cost-run2.txt` show it at 23:30. The
  articles cite these files to show how much the numbers move from one run to another.
- `touch.c` (part 13), `forktime.c` and `cow.c` (part 14), `shrink.c` (part 16) and
  `zombie.c` (part 20) call `memset` through a volatile function pointer, so that gcc keeps
  the writes. Part 13 shows what gcc does without it.

## The parts

1. From execve to main. `hello.c`, `hello.rs`, `hello_nomain.rs` (a Rust program with a
   C `main` and no std runtime start), `spawn.c` (starts programs many times with
   `posix_spawn` and prints the median start time), `who.py` (names the function of the
   program behind each system call of an `strace -k` trace).
2. ELF headers, segments and sections. `patch_interp.py` writes a copy of a binary whose
   interpreter path names a file that does not exist, on purpose. `run.sh` also strips
   the section headers.
3. Where variables live. `places.c` and `statics.rs` put variables in every kind of
   section. `buffer.c` has a 16 MiB initialized array, to show the size of `.data` in the
   file; `run.sh` makes a variant with `sed`.
4. Undefined references. `main.c` and `greet.c` are linked in several ways. Wrong on
   purpose: `greet_int.c` defines `greet` with the wrong type, `nodecl.c` calls a
   function without declaration, `missing.rs` declares a C function that does not exist.
5. Relocations. `holes.c` and `other.c`; `count_relocs.sh` and `reloc_sections.py` count
   relocations by type and by target section; `ldstats.py` gives the median of
   `LD_DEBUG=statistics` over many runs; `tsc.c` prints the rate of the time stamp counter.
6. Static and dynamic linking. `whoami.c` and `whoami.rs` look up a user with
   `getpwnam`; the static C binary crashes for a user that does not exist, which is the
   effect the article shows, and `crash.py` is the gdb script that explains the crash.
   `sleeper.c` and `memory.sh` measure the memory of many copies.
7. How the loader finds a library. `greet.c` and `main.c` build a library with a soname.
   `run.sh` moves the library away on purpose to get the "not found" error.
8. PLT and GOT. `twice.c` calls `puts` twice for gdb, `firstcall.c` and `firstcall.py`
   time the first and the second call of a library function, `printf_newline.c` shows a
   `printf` that becomes `puts`.
9. LD_PRELOAD. `count.c` counts allocations, with a correct start for `dlsym`.
   `naive_malloc.c` and `naive_calloc.c` are wrong on purpose: they have no protection
   against the recursion of `dlsym`, to test if the trap happens (it did not with glibc
   2.43). `usecalloc.c` calls `calloc`.
10. Before main. `ctors.c` (constructors with priorities, destructors, `atexit`),
    `libinit.c` (a constructor in a library), `tiny.c` (a program without libc that only
    calls the exit system call).
11. The initial stack. `auxv.c` walks argv, envp and the auxiliary vector; `args.rs`
    compares `getauxval(AT_EXECFN)` with `std::env::args()`.
12. /proc/self/maps. `maps.c` and `maps.rs` print their own memory map.
13. Demand paging. `touch.c` touches 1 GiB in several ways, `vec_touch.rs` does the same
    with `Vec`, `gotcalls.py` names the library functions that a function calls through
    the GOT. `run.sh` generates `touch_direct.c` with `sed`: gcc removes its `memset`,
    which the article shows.
14. fork and copy-on-write. `forktime.c` times `fork` and `posix_spawn`, `cow.c`
    measures the copies after `fork`.
15. brk and mmap. `sizes.c` allocates seven sizes between markers, `grow.rs` grows a
    `Vec` to 64 MiB.
16. Freeing memory. `shrink.c` and `shrink.rs` free most of one million blocks;
    `calls_per_step.awk` counts `brk` and `madvise` per step of an strace output.
17. System calls and the vDSO. `cost.c` and `cost.rs` time calls in loops,
    `vdso_dump.c` writes the vDSO of the process into a file.
18. Stack overflow. `overflow.c` and `overflow.rs` recurse forever on purpose. The mode
    `report-no-altstack` installs the SIGSEGV handler without an alternate stack, on
    purpose, to show that it cannot run. The handler of `overflow.c` calls `snprintf`,
    which is not async-signal-safe; it is enough for a process that dies right after.
    `guards.py` names the functions behind each `mprotect(..., PROT_NONE)` of an
    `strace -k` trace.
19. Thread-local storage. `threads.c` (a thread-local variable in three threads),
    `libtls.c` and `cost.c` (the access models and their cost), `tls.rs` (three kinds of
    `thread_local!`), `dtors.gdb` (stops at each registration of a thread-local
    destructor).
20. Exit. `buffering.c` (output with `exit` and `_exit`), `handlers.c` (`atexit`),
    `codes.c` (exit statuses; with the argument `exit`, the children call `exit` and one
    line is printed twice, on purpose), `threads_exit.c` (`exit` with a second thread),
    `zombie.c` (a zombie and what the kernel frees), `exit.rs` (`process::exit` and
    `abort`, which loses the output on purpose).
