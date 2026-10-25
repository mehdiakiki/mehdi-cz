# When the benchmark lies

The programs behind the series "When the benchmark lies" on mehdi.cz: twenty
ways a performance number can be wrong, each reproduced on one laptop.

## How to run

```sh
sh experiments/when-the-benchmark-lies/run.sh        # every part
sh experiments/when-the-benchmark-lies/run.sh 7      # part 7 only
sh experiments/when-the-benchmark-lies/run.sh 1 20   # parts 1 and 20
```

Build products go to `out/` (ignored by git). By default the result files go
to `out/results/`, so a new run never overwrites the files that the articles
quote. The files in `results/` are the runs the articles quote; they were made
with `RESULTS=results sh run.sh N`.

`results/second-run/` is a second run of every part: the complete output of
one `sh run.sh` (default `RESULTS=out/results`), copied there. The laptop was
quieter during that run. Parts 4, 5, 6, 7, 12, 13 and 16 describe how their
second run differs from their own files, and parts 2, 3, 8, 14, 15, 18 and 19
mention some details of theirs. (The shell
printed a syntax error after part 20 had finished, because a comment of
`run.sh` was edited while the script was running and the shell read the
shifted end of the file again. `sh -n run.sh` reports no error.)

`CPU` (default 2, a P-core hardware thread) and `ECPU` (default 10, an E-core)
choose the CPUs that `taskset` uses.

Timing numbers change from run to run. That is expected: the laptop is shared
with other work. Every result file starts with the machine state at that
moment (load average, governor, current frequency of the pinned CPU, and how
busy each CPU was during one second), and most parts repeat their runs. The
logic and the non-timing outputs (assembly, counts, totals) do not change.

## Machine and toolchain

- Intel Core i7-1260P: CPUs 0-7 are the four P-cores (hardware thread siblings
  0-1, 2-3, 4-5, 6-7), CPUs 8-15 are the eight E-cores. L1d 48 KiB per P-core
  and 32 KiB per E-core, L2 1.25 MiB per P-core and 2 MiB per cluster of four
  E-cores, L3 18 MiB shared.
- Linux 6.6.126 (Manjaro), glibc 2.43, `intel_pstate` with the `powersave`
  governor, transparent huge pages `always`.
- rustc 1.98.0 (`rustc +1.98.0`, std only), gcc 15.2.1, Python 3.14.3,
  OpenJDK 17.0.18, strace 6.19, binutils 2.46.

## The harness

`harness.rs` is a small timing harness that most Rust programs include with
`#[path = "../harness.rs"] mod harness;`. `Bench::run` makes `warmup` calls,
then `samples` samples; each sample times `iters` calls with `Instant` and
gives nanoseconds per call. Both the input and the output of every call go
through `std::hint::black_box`. `report` prints the min, median, p90 and max
(each one the sample at index round((n - 1) q) of the sorted samples) and,
when `RAW_DIR` is set, writes every sample to
`$RAW_DIR/<name>.txt`.

## Parts

### Part 1: the benchmark that measured nothing (`p01/`)

- `sum.rs` sums 4096 `u64` values one million times in five ways. Three of
  them are wrong on purpose: `bench_unused` never uses the result, so rustc
  deletes the loop; `bench_printed` uses the result and happens to keep the
  work; `bench_printed_outlined` uses the result too, but `sum_outlined` is
  `#[inline(never)]`, so LLVM calls it once and multiplies by the number of
  iterations. `bench_black_box` and the harness measure the real work.
- `sum.c` is the same in C with gcc `-O2`: `bench_unused` is wrong on purpose
  (gcc deletes the loop), `bench_volatile` stores every result to a
  `volatile` global, `bench_barrier` uses empty `asm` statements to hide the
  input pointer and to use the result.
- The result file has the assembly of the interesting functions and three runs
  of each program.
- `results/p01-measured-nothing-busy.txt` is the same command, run twelve
  minutes before `p01-measured-nothing.txt` while other programs used all 16
  CPUs (load average 15.5). It is kept to show what load does to the same
  numbers; `run.sh` writes only `p01-measured-nothing.txt`.

### Part 2: a debug build measures a different program (`p02/`)

- `work.rs` has three functions over 4096 `u64` values: `sum_iter`
  (`iter().sum()`), `sum_index` (an indexed loop with bounds checks) and
  `score` (`map`, `filter` and `sum` with two closures). `run.sh` builds it
  with `-C opt-level=0`, `1`, `2` and `3`, and runs the four builds in three
  interleaved rounds. The summary is the median of the three round medians.
- `sum.c` is a plain C sum, built with `-O0` and `-O2`.
- `cargo-bench/` is a crate without dependencies whose only test times
  `score`. Timing inside `cargo test` is the mistake this part shows: `cargo
  test` uses the `test` profile, which inherits `dev` (no optimization).
  `run.sh` runs it with `cargo test` and with `cargo test --release`
  (target directory in `out/`).

### Part 3: the compiler computes the answer (`p03/`)

- `closed.rs`: `sum_below_1000` sums `0..1000` with a constant bound, and the
  assembly is one constant. `sum_below_n` gets `n` through `black_box`, and
  LLVM still replaces the loop with a formula, so the time is the same for
  n = 1,000 and n = 1,000,000,000. `sum_array` sums the content of a slice,
  which no formula can replace, and its time grows with the length (1,000 to
  10,000,000 elements). The result file has the assembly and the LLVM IR.

### Part 4: why the first run is slower (`p04/`)

- `first.rs` computes `out[i] = 3 * input[i] + 1` over two 512 KiB buffers and
  times every iteration in a fresh process, with the minor page faults of each
  iteration (`getrusage`). The mode argument prepares the process before the
  first iteration: `natural` (nothing), `prefault` (write `out` first, so no
  page faults), `evict` (read and write 64 MiB first), `spin` (busy loop for
  300 ms), `sleep` (sleep 300 ms), `touch` (read both buffers after the pause),
  `once` (one iteration and exit), `detail` (print the first iterations).
  `run.sh` runs every mode in 10 interleaved rounds and prints the medians.
- `launch.rs` starts a program N times and times each whole process from the
  outside.
- `lazy.c` times the first three calls of `random()`. gcc links it without
  `BIND_NOW`, so the first call goes through lazy binding; `run.sh` runs it
  again with `LD_BIND_NOW=1`. rustc links with `BIND_NOW` (`readelf -d`).

### Part 5: JIT warmup (`p05/`)

- `Warmup.java` calls a small function `mix` from a loop in `batch`, in
  batches of 1000 calls, and prints the time per call of every batch. It
  aligns its clock with the JVM uptime, so `run.sh` can merge the batches with
  the compile log of `-Xlog:jit+compilation=debug` (uptime in nanoseconds)
  into `results/p05-jit-timeline.txt`. It also prints a summary: the first
  batch, the median of the last 100 batches, the first batch that reached
  that level, and how many later batches were more than 2x slower.
- `run.sh` runs one JVM with the timeline, 10 fresh JVMs with medians of
  windows of 100 batches and the time of the last compile event, 8
  interleaved rounds of the default JVM against `-XX:TieredStopAtLevel=1`
  (C1 only) and `-XX:-TieredCompilation` (C2 only), and 3 JVMs with `-Xint`.
  `JCPUS` (default `2,4`) chooses the CPUs.
- `results/p05-jit-flags.txt` has three more thresholds of the same JVM
  (`Tier3MinInvocationThreshold`, `Tier3CompileThreshold` and
  `Tier3BackEdgeThreshold`). It was saved on its own, after the other files of
  part 5; `run.sh` writes it at the start of part 5.
- `warmup.js` is the same idea for Node.js 22.23.1 with `--trace-opt`
  (`NODE22` gives the path; the step is skipped when it is missing).

### Part 6: my laptop changed its CPU speed during the benchmark (`p06/`)

- `freq.rs` pins a worker thread to `CPU` and a sampler thread to `ECPU`
  (with `sched_setaffinity`). The worker runs a dependent chain of one
  multiplication and one addition per turn and counts finished chunks. The
  sampler wakes up every 5 ms during the first 500 ms and then every 100 ms,
  and prints the work done since the last sample, `scaling_cur_freq` of the
  worker CPU, the temperature of the worker's core and of the package
  (`coretemp`), and the work per cycle. With a list of CPUs as fourth
  argument, it also runs the same chain on these CPUs during every second
  phase of 10 s.
- `run.sh` makes 5 short starts after 3 s of sleep, one run of 60 s alone and
  one run of 60 s with load on the E-cores 11 to 15, and prints medians per
  phase. The full traces are `results/p06-trace-alone.txt` and
  `results/p06-trace-load.txt`.
- `results/p06-first-test.txt` is the first test of `freq.rs` (40 s, with the
  same E-core load), made before the start loop was added to `run.sh`. Its
  `temp_C` column is the `x86_pkg_temp` thermal zone. It is kept because it
  shows the slow start from idle that the saved run shows only once.
- Nothing in this part changes a system setting. The energy performance
  preference (`power` on this laptop), the governor and turbo stay as they are.

### Part 7: the benchmark ran on an efficiency core (`p07/`)

- `cores.rs` measures two functions with the harness: `sum` (2048 `u64`
  values, a vector loop) and `chain` (10,000 dependent turns of
  `x * K + C`; LLVM turns them into 1,250 steps of one multiplication and one
  addition, and the `consts` mode prints the constants of these steps). Modes:
  `pinned CPU` (also reads the frequency after the run, and for a P-core how
  busy the sibling thread was during the run, from `/proc/stat`), `unpinned`
  (records the CPU at the start and at the end), `pair CPU CPU` (two threads,
  each pinned, starting each measurement together).
- `run.sh` runs 10 rounds of P-cores 2 and 6 and E-cores 10 and 14, 30 runs
  without `taskset`, and 10 rounds of one thread on CPU 2, two threads on CPUs
  2 and 3 (one core) and two threads on CPUs 2 and 4 (two cores). The saved run
  was started when the 1-minute load average was below 3.5.

### Part 8: the average hides the slow requests (`p08/`)

- `push.rs` times every single `Vec::push` of 4,000,000 `u64` values with
  `Instant`, and prints the mean, the percentiles, the share of the slowest
  0.1%, the reallocations, the minor page faults of the loop (they include
  about 3,900 faults of the array that stores the times, which happen between
  the measurements) and `AnonHugePages` from `/proc/self/smaps_rollup`, and a
  histogram with buckets that double. Modes: `grow` (starts empty), `reserved`
  (full capacity, memory untouched), `touched` (memory written before), and
  `,nothp` to disable transparent huge pages for the process with
  `prctl(PR_SET_THP_DISABLE)`. `run.sh` prints the `Normal` line of
  `/proc/buddyinfo` (free blocks per order) before each run, and the
  `mmap`/`mremap` calls of one growing run with `strace`.
- `requests.rs` simulates 20,000 requests: a normal request hashes 256
  numbers, and one in a hundred (fixed xorshift seed) also hashes 2,000,000
  numbers. It prints percentiles, how many requests are near the mean, and how
  many groups of 10 requests contain a slow one.

### Part 9: coordinated omission (`p09/`)

- `co.rs` starts a server thread on 127.0.0.1 (a free port) that answers
  8-byte requests with the same bytes and, every 5 s starting at 2.5 s, makes
  the next answer wait 500 ms. The client modes run for 20 s on one
  connection: `closed` (next request right after each answer), `paced` (at
  most one request per millisecond, waiting for each answer, latency from the
  real send time; the output also has a corrected version that adds the
  missing samples like HdrHistogram's `recordValueWithExpectedInterval`) and
  `open` (one request per millisecond on a fixed schedule from a separate
  thread, latency from the planned send time).

### Part 10: which clock to use when you measure time (`p10/`)

- `clocks.c` has four modes: `table` (for eight clocks: `clock_getres`, the
  cost of one `clock_gettime`, and the smallest difference between two
  consecutive readings over 1,000,000 pairs), `calls N` (1000 calls of clock
  number N, for `strace -c`), `drift S` (reads `adjtimex` in read-only mode,
  then compares how far `CLOCK_MONOTONIC` and `CLOCK_MONOTONIC_RAW` advance in
  S seconds) and `boottime` (the difference between `CLOCK_BOOTTIME` and
  `CLOCK_MONOTONIC`, that is the time spent in suspend).
- `instant.rs` measures `Instant::now()` and `SystemTime::now()` with the
  harness, and the smallest difference between two consecutive `Instant`s.
- `clocks.py` prints `time.get_clock_info` for four Python clocks and the cost
  of three of them with `timeit`.
- `run.sh` also records the clocksource, the TSC flags, `CONFIG_HZ`, and the
  synchronization lines of `timedatectl` (the lines with the date are not
  kept). Nothing changes the clock.

### Part 11: measuring something faster than the clock (`p11/`)

- `fast.rs` times three loops of K calls each, with one timing sample per
  call of the loop, for K = 1, 10, 100, 1000 and 1,000,000: `independent`
  (K calls of the splitmix64 finalizer on new inputs), `dependent` (each call
  mixes the result of the previous one) and `empty` (the loop of
  `independent` without the work). It prints the median and the minimum in
  ns per call, and the frequency of its CPU right after the run.

### Part 12: how many benchmark runs are enough (`p12/`)

- `sort.rs` creates the same 1,000,000 pseudo-random `u32` values (fixed
  xorshift seed), sorts them with `sort_unstable`, and prints the time of the
  sort in ms and the frequency of its CPU right after it.
- `run.sh` makes three sets of 100 fresh processes, 20 s apart, and saves the
  raw values in `results/p12-times-1.txt` to `p12-times-3.txt`.
- `stats.py` (Python standard library only) prints, for set 1, the summary,
  a histogram, the medians of groups of 10 runs in order, and a 95% bootstrap
  interval of the median (10,000 resamples with a fixed seed) for the first
  5, 10, 30 and 100 runs and for runs from other places of the set; then one
  line per set with its interval, and the clock and the cycles per sort
  (ms times MHz) of each set.

### Part 13: compare two versions by interleaving the runs (`p13/`)

- `sort.rs` is the sort of part 12 (without the frequency). `run.sh` builds A
  (1,000,000 values), copies it to B (an identical file, checked with `cmp`),
  and builds C with `--cfg bigger` (1,040,000 values, about 4.3% more work).
- Each experiment makes 50 runs of each of two versions, in blocks (all of
  the first, then all of the second) or interleaved (alternating), and is
  repeated 5 times for A against B and A against C. The raw values are in
  `results/p13/`.
- `compare.py` prints the medians and the difference with a 95% bootstrap
  interval: unpaired (each version resampled alone) for blocks, paired
  (whole pairs of neighboring runs resampled) for interleaved runs.

### Part 14: can environment variables change how fast your code runs? (`p14/`)

- `envstack.c` has two workloads: `copy` (reads a global array of 1024
  floats and writes an array of 1024 floats on the stack, 20,000 times) and
  `fib` (recursive Fibonacci of 25). It measures its workload 7 times and
  prints the address of its stack array and the median time.
- `run.sh` starts it with `env -i PAD=<n bytes>` and `setarch $(uname -m) -R`
  (no address randomization), so that only the environment moves the stack.
  It prints the address for a few sizes, then makes three passes over the
  sizes 0 to 4080 (step 16): forward, backward, and a fixed shuffled order
  (index times 97 modulo 256). The raw values are in `results/p14-scan.txt`.
- `analyze.py` compares each size with the median of its pass: correlations
  between passes, the sizes that are slow in all passes, and the median
  deviation by region of 256 bytes.

### Part 15: does code alignment change the speed of the same code? (`p15/`)

- `align.c` has 128 copies of the same loop (one load, eight simple
  operations, a compare and a jump; it assumes n > 0): for each padding from
  0 to 63 bytes, two copies `a` and `b`. Each function is aligned to 64 bytes,
  and the loop body is written in inline assembly with `.nops N` just before
  the loop label, so that gcc can not realign it. It measures each function
  (200 calls of 1024 elements) in 21 rounds, with a new shuffled order of the
  128 functions in each round, and prints the median of each function.
- `run.sh` prints the start of each loop modulo 64 (from `objdump`; this step
  needs GNU awk, for `strtonum`), runs the program three times (CPU 2, CPU 2,
  CPU 6), and `summary.py` compares the
  paddings with their median and the two copies of each padding (the A/A
  noise).
- `plain.c` is the same loop in plain C. `results/p15-gcc-loop-alignment.txt`
  shows the `.p2align 6` that gcc puts before the loop even with
  `-fno-align-loops`, which is why `align.c` uses inline assembly.

### Part 16: when the working set no longer fits in cache (`p16/`)

- `chase.rs` builds a random permutation that is one single cycle (Sattolo's
  algorithm, fixed xorshift seed) for 33 sizes from 4 KiB to 256 MiB (each
  1.41 times the previous), measures 4,000,000 steps of `i = a[i]` three
  times (median), a sequential sum of the same array, and prints
  `AnonHugePages`. With `nothp` it disables transparent huge pages for the
  process first.
- `run.sh` prints the cache sizes from `/sys`, then makes three rounds of a
  P-core run (CPU 2), an E-core run (CPU 10) and a P-core run without huge
  pages, with the free blocks of `/proc/buddyinfo` before each round.
  `summary.py` prints the median and the range of the three runs per size.

### Part 17: why sorted data can make the same loop faster (`p17/`)

- `branch.rs` sums the bytes of at least 128 in 32 KiB of random bytes (fixed
  xorshift seed) and in a sorted copy, with three functions that give the
  same result: `sum_filter` (iterators), `sum_if` (a plain `if`) and
  `sum_if_effect` (the taken branch passes the sum through `black_box`, so the
  compiler must keep a real branch). It prints ns per byte for random and
  sorted data and the ratio.
- `run.sh` builds it with `-C opt-level=1` and `-C opt-level=3`, prints the
  assembly of the three functions, and runs both builds three times,
  alternating.

### Part 18: the benchmark measured the allocator (`p18/`)

- `alloc.rs` replaces the global allocator with the system allocator and a
  counter of the calls to `alloc`: one shared atomic counter for the process,
  one counter per thread (`thread_local!`), or no counter. `single` times the
  first call of a function that fills a new 256 KiB `Vec` in a fresh process,
  with its page faults, then measures four versions with the harness: a small
  `format!` into a new `String` or into a reused buffer, and the 256 KiB `Vec`,
  new or reused, with the allocations and page faults per call. `strace` makes
  1,000 calls of the 256 KiB function for `strace -c`. `threads CPUS COUNTER`
  starts one thread per CPU of the list, pins it there with
  `sched_setaffinity`, measures the two small versions in all threads at the
  same time (a barrier before each one), checks that each thread is still on
  its CPU, and prints the medians of the threads and the frequency of the CPUs
  at the end.
- `run.sh` prints which CPUs share a core, runs `single` three times on CPU 2,
  `strace -c` for the new and the reused 256 KiB versions, and three rounds of
  the thread test, each counter with 1 thread (CPU 2), 4 threads on four
  different cores (CPUs 0, 2, 4 and 6) and 8 threads, two on each core (CPUs 0
  to 7).

### Part 19: the microbenchmark won and the program got slower (`p19/`)

- `table.rs` compares a function that divides (`u32::MAX / x` for a 16-bit
  `x`) with a table of its 65,536 results (256 KiB). `micro` sums both
  versions over 4,096 random keys with the harness, three times. `program`
  runs a loop over 4,194,304 records (a random key and a random bucket) that
  adds the function of the key to the counter of the bucket, for 12 sizes of
  counters from 16 KiB to 64 MiB, checks that both versions give the same
  counters, and times 5 passes of each version, alternating. `stream` reads a
  part of a 256 MiB buffer (0 to 64 MiB) before each burst of 4,096 new keys
  and times only the bursts, in blocks of 50 bursts per version, so that one
  read separates two bursts of the same version.
- `run.sh` prints the cache sizes of CPU 2 from `/sys` and runs the three
  modes on CPU 2, three rounds.

### Part 20: a benchmark result someone else can check (`p20/`)

- `run.sh` writes `results/p20-machine.txt` (CPU model, microcode, kernel,
  memory, the maximum and base frequency, the SMT sibling, the governor and
  the energy performance preference of every CPU, the `intel_pstate`
  settings, transparent huge pages, the clocksource, address randomization,
  the toolchain and the load). Then it runs parts 1 and 17 again into
  `results/p20-rerun/`, runs the program of part 1 once more with `RAW_DIR`
  set (`results/p20-raw/`), and `compare.py` writes `results/p20-rerun.txt`:
  the load and frequency lines of both runs, whether the assembly is
  identical, the published and the new numbers side by side with the ratio of
  the medians, and the summary of the raw samples computed again from the
  file.
- `compare.py` always compares against `results/`, the files that the
  articles quote, even when `RESULTS` points somewhere else.
