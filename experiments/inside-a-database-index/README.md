# Inside a database index: experiments

Experiments for the ten-part series "Inside a database index" on mehdi.cz.
Every number, plan and output quoted in the articles comes from the files in
`results/`, produced by `run.sh` on the machine described below.

## Toolchain

- `sqlite3` command line shell 3.51.2 (2026-01-09), with SQLite compiled into
  the binary (it does not load `libsqlite3.so`). Its
  `PRAGMA compile_options` include `ENABLE_STAT4`, `ENABLE_DBSTAT_VTAB`,
  `ENABLE_DBPAGE_VTAB`, `ENABLE_BYTECODE_VTAB`, `ENABLE_EXPLAIN_COMMENTS`,
  `ENABLE_FTS5`, `SECURE_DELETE`, `DEFAULT_CACHE_SIZE=-2000` and
  `DEFAULT_PAGE_SIZE=4096`. `ENABLE_STMT_SCANSTATUS` is not compiled in, so
  `.scanstats` is not available; the experiments use `.stats on` instead.
- Python 3.14.3, standard library only. Its `sqlite3` module uses the system
  `libsqlite3.so.3.51.2`, with the same options as the shell except the few
  that only the shell adds (`DQS=0`, `ENABLE_BYTECODE_VTAB`,
  `ENABLE_DBPAGE_VTAB`, `ENABLE_EXPLAIN_COMMENTS`, `ENABLE_OFFSET_SQL_FUNC`,
  `ENABLE_UNKNOWN_SQL_FUNCTION`).
- `strace` 6.19 and `fincore` (util-linux 2.41.3).
- Linux 6.6.126, ext4 on an NVMe SSD (WD PC SN810), Intel Core i7-1260P.
  The laptop was also running other work, so every timing file records the
  load average.

## Running

```sh
sh run.sh        # every part, outputs in out/results/
sh run.sh 7      # part 7 only
RESULTS=results sh run.sh 7   # rewrites results/p07-*.txt
```

`run.sh` first rebuilds `out/users.db`: one million generated users with a
fixed seed (`common.SEED`). The first line of `results/p00-users.txt` is a
digest of all rows, so a run with different data is easy to see. Most parts
copy this file, work on the copy and delete it at the end; part 3, part 10
and the auto_vacuum section of part 9 build their own databases. The copy is
synced to the disk before a part starts (`common.copy_db`), so its pages are
clean in the page cache and the measurements do not include its writeback. Every run
also writes `p00-machine.txt`, the SQLite defaults of this build. The largest
database is about 250 MB. A full run writes a few GB in total, most of it in
parts 3 and 9, and took about five minutes on this laptop.

`run.sh` sets `SQLITE_TMPDIR` to `out/`, so the temporary files of sorts and
of VACUUM are created next to the databases, on the same disk.

Timings and load averages change from run to run. Everything else (pages,
row counts, plans, digests, bytecode, bytes written) must stay the same,
with one exception by design: in part 10 the number of documents, and the
number of documents that a kill left without a search entry, depend on where
the kills land.

## Files

Shared:

- `common.py`: the users table generator, timing helpers, `fincore` and
  `posix_fadvise` helpers, `/proc/self/io` counters.
- `make_users.py`: builds `out/users.db` and prints a summary.
- `sqlitefile.py`: reads b-tree pages, cells and records straight from a
  database file, following the documented file format.
- `p00_machine.sql`: the defaults of this SQLite build for a new database
  file (`secure_delete`, `cache_size`, `page_size`, `auto_vacuum`, some
  compile options, `.scanstats`).

Per part:

1. `p01_sizes.sql`, `p01_inside.py`, `p01_rebuild.py`, `p01_without_rowid.sql`:
   file and b-tree sizes before and after `CREATE INDEX`, the first index
   entry and its table row decoded from the raw file, drop and rebuild with a
   digest of the entries, and a WITHOUT ROWID copy of the table.
2. `p02_queries.sql`, `p02_time.py`, `p02_sort.sql`, `p02_bytecode.sql`:
   plans, `.stats` counters and timings with and without indexes, warm and
   cold, and the bytecode of the plans. `p02_steps.sql` prints the virtual
   machine step counter without `.eqp` (the counter counts the plan lines too
   when `.eqp` is on).
3. `p03_bulk.py`, `p03_order.py`, `p03_spills.sql`, `p03_commit.py`: one
   million inserts with 0, 1, 3 and 6 indexes, the same keys sorted and
   shuffled, the spill counter, one transaction per row, and the system calls
   of a commit.
4. `p04_plans.sql`, `p04_time.py`: an index on (country, created_at) against
   (created_at, country), skip-scan after ANALYZE, ORDER BY, offset and cursor
   pages. `p04_skipscan.sql` prints the bytecode of the skip-scan.
5. `p05_stats.sql`, `p05_time.py`: (email) against the covering
   (email, status), one row and ranges, warm and cold.
6. `p06_cases.py`: queries where an existing index is not used, with a fix
   for each.
7. `p07_stats.py`: plans without statistics, after ANALYZE, after a data
   change, after `PRAGMA optimize`, and in a connection that stays open.
8. `p08_partial.py`: a partial index, the queries that can and cannot use it,
   expression indexes on `lower(email)` and on a JSON field, and the write
   cost of each index.
9. `p09_free.py`: a large delete, free pages, page reuse, `secure_delete`,
   REINDEX, VACUUM (with the bytes written per file) and auto_vacuum.
10. `p10_writer.py`, `p10_sync.py`: a writer that is killed with SIGKILL 200
    times in each of three modes, the FTS5 integrity check and rebuild.

## What the programs do wrong on purpose

- `p01_rebuild.py` overwrites the rowid of one index entry in a copy of the
  database file, so that the index disagrees with the table. It then runs
  `PRAGMA integrity_check` and `REINDEX`.
- `p02_time.py`, `p05_time.py` drop the cached pages of their own database
  file with `posix_fadvise(POSIX_FADV_DONTNEED)` to measure a cold cache.
  No system setting is changed.
- `p03_commit.py` commits every row separately, the slow way.
- `p06_cases.py` writes queries that cannot use the index, and joins a TEXT
  column with an INTEGER column.
- `p07_stats.py` changes most of the rows without running ANALYZE, runs
  ANALYZE from another process while a connection stays open, and keeps a
  statement prepared before ANALYZE in Python's statement cache.
- `p09_free.py` turns `secure_delete` off in one copy, to show that deleted
  data stays in the file, and calls `PRAGMA incremental_vacuum` once without
  reading its rows.
- `p10_writer.py` in mode `two` writes a document and its search entry in two
  transactions, and `p10_sync.py` kills it between them on purpose, many
  times. In the trigger mode, `p10_sync.py` drops the UPDATE trigger before
  changing a document, so that the search index becomes stale.

## Results

- `results/p00-users.txt`: the generated data set.
- `results/p00-machine.txt`, `results/p02-vm-steps.txt` and
  `results/p04-skip-scan.txt` were saved on their own, after the other
  results, with `RESULTS=out/extra sh run.sh 2_steps 4_skipscan` and a copy
  of these three files. So the timing files of parts 2 and 4 were not run
  again. In a full run, `run.sh` writes them together with the rest.
- `results/p01-second-copy.txt` to `results/p10-derived-search-index.txt`:
  one file per part, exactly as `run.sh` wrote it with `RESULTS=results`.
