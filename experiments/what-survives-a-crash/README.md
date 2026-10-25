# What survives a crash: the fixture

Programs and outputs behind the 20 parts of the series "What survives a crash" on
www.mehdi.cz: write and fsync, saving files, directories, torn writes, a crash
simulator, a log, a key-value store with a write-ahead log, SQLite, durability
settings, group commit, mmap, checksums, several files, and crash testing.

## Running

```sh
sh experiments/what-survives-a-crash/run.sh             # every part, in order
sh experiments/what-survives-a-crash/run.sh 7           # part 7 only
sh experiments/what-survives-a-crash/run.sh p03_tools   # one block of a part
RES=out/rerun sh experiments/what-survives-a-crash/run.sh   # write the results elsewhere
```

`run.sh` builds into `out/` (ignored by git) and writes the outputs into
`results/pNN-*.txt`. The files in `results/` are the outputs that the articles
quote. Timings, random kill moments and the load of the machine change from run
to run, so a new run gives other numbers; the logic and the non-timing outputs
stay the same.

One output was saved on its own: `results/p02-flush.txt` comes from a later,
separate run of the block `p02_flush` (`run.sh p02_flush`), not from the run
that made the other part 2 outputs.

Everything runs as a normal user. Run it on a real disk filesystem: `/tmp` is
often tmpfs, where fsync does nothing. Part 2 uses `/dev/shm` on purpose, once,
and removes its file. Some paths are specific to the laptop where the outputs
were made and must be changed on another machine: the disk `nvme0n1` in
`dirty.rs`, `synccost.rs`, `dirsync.rs`, `groupcommit.rs`, `mmapwrite.rs`
and `sqlbench.py` (for `/sys/block/nvme0n1/stat`), and the ext4
partition `nvme0n1p2` in `zerolen.rs` and `run.sh` (for `/proc/fs/ext4` and
`/sys/fs/ext4`).

## Toolchain of the recorded outputs

- Linux 6.6.126 (Manjaro), ext4 with `data=ordered`, `delalloc`, `auto_da_alloc`,
  `barrier`, `commit=5`; a WD PC SN810 NVMe SSD with a volatile write cache. The
  exact settings are in `results/p01-machine.txt`.
- `rustc +1.98.0` (Rust 1.98.0, edition 2024), standard library only. Functions
  that std does not have are declared with `extern "C"` (the `cachestat` system
  call through `syscall()`, and `mmap`, `msync`, `munmap` and `renameat2`).
- gcc 15.2.1 for `faultshim.c`, Python 3.14.3 (standard library only),
  strace 6.19, sqlite3 3.51.2, GNU gzip 1.14, GNU sed 4.9, coreutils 9.10,
  git 2.53.0.

## Files, by part

| part | files | what they do |
| --- | --- | --- |
| shared | `common.rs` | reads `/proc/meminfo`, `/proc/self/io`, `/proc/vmstat`, `/proc/self/stat`, the disk counters and `cachestat` |
| 1 | `dirty.rs`, `chunks.rs`, `tsum.py` | 256 MiB of writes and one fsync with all counters; the same without fsync, sampled every second; a 64 MiB file killed with kill -9 and checked; a summary of `strace -T` times |
| 2 | `synccost.rs` | 1,000 rounds of 4 KiB with fsync, fdatasync, overwrite with fdatasync, `O_DSYNC`, and the tmpfs run; the mode `flush-only` (block `p02_flush`): 1,000 fdatasync calls on a synced file with nothing to write |
| 3 | `save.rs`, `killer.py`, `stracelib.py`, `opsview.py` | three ways to save a file; a driver that kills a command at random moments and counts what a checker prints; an strace parser; a viewer that prints the file operations of a trace |
| 4 | `dirsync.rs`, `savedir.py` | the cost of a directory fsync in four situations; the durable save in Python, with and without `flush()` |
| 5 | `zerolen.rs` | observes `auto_da_alloc`: dirty pages, writeback and ext4's delayed blocks around a rename or a close |
| 6 | `bigwrite.rs`, `watchsize.py` | one `write()` of 1 GiB killed early; a second process that watches the size; concurrent `O_APPEND` writers |
| 7 | `crashsim.py`, `simsave.py` | the crash simulator (its model is written at the top of `crashsim.py`); the four save variants under it |
| 8 | `record.rs`, `applog.rs`, `simlog.py` | the record format with CRC-32 written by hand; an append-only log with recovery, a kill test and a fuzzer; the log under the simulator |
| 9 to 11 | `kv.rs`, `simkv.py`, `samemap.py` | the key-value store with a write-ahead log, segments, snapshots and recovery; its simulator scenarios; a comparison of two dumps |
| 12 | `faultshim.c`, `retrysync.rs` | an LD_PRELOAD library that makes the Nth `fsync`, `fdatasync` or `write` fail; a program that retries a failed fdatasync |
| 13, 14 | `sqlbench.py` | single-row transactions with the sqlite3 tool, with the disk flush count |
| 15 | `sqlcheck.py` | after a killed sqlite3 run, checks the acknowledged rows and `PRAGMA integrity_check` |
| 16 | `groupcommit.rs` | 1 to 16 writer threads: a sync per record, group commit, and group commit with a delay |
| 17 | `mmapwrite.rs` | writes through a shared mapping with its minor and major page faults, msync and fsync, kill -9, and SIGBUS after a truncate |
| 18 | `bitflip.py` | flips one bit in a log, a SQLite database, a gzip file and a text file |
| 19 | `twofiles.rs`, `simtwo.py` | two files updated together: separately, with a symlink swap, and with `RENAME_EXCHANGE` |
| 20 | `crashtest.py`, `kvcheck.py` | the store and four bug variants against four test methods |

## What is wrong on purpose

Several programs contain a mistake on purpose, so that a test can show it:

- `save.rs`: `naive` truncates the file and writes in place; `rename` replaces it
  without fsync; `safe` has no directory fsync. Only `durable` is correct.
- `savedir.py --no-flush` calls `os.fsync` before Python has written its buffer.
- `applog.rs append ... fsync-no-dir` never syncs the directory of a new log, and
  the fuzzer tests a second format (`PayloadOnly`) whose CRC does not cover the
  length and which accepts empty records, so a tail of zero bytes reads as empty
  records.
- `kv.rs --bug NAME`: `ack-before-fsync` prints `ok` before the fdatasync;
  `snapshot-not-durable` renames the snapshot without syncing it and deletes the
  old log; `lose-tail` keeps one log and truncates it after the snapshot;
  `double-apply` writes a snapshot that does not say which segment it covers;
  `no-dir-fsync` skips every directory fsync; `no-crc-check` recovers without
  checking the CRCs. Without `--bug`, the store is the correct version.
- `retrysync.rs` retries a failed fdatasync and reports success.
- `twofiles.rs separate` replaces two files one after the other, so a crash can
  leave them at different versions.
- `faultshim.c` makes calls fail when the variables `FAULT_CALL`, `FAULT_AT` and
  `FAULT_ERRNO` ask for it.
