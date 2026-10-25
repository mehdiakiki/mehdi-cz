"""Insert 1000 new users into the full table, one transaction per row, then in one transaction."""

import os
import statistics
import sys
import time

import common
from p03_bulk import SIX

N = 1000
INSERT = "INSERT INTO users (email, country, created_at, status) VALUES (?, ?, ?, ?)"


def new_rows(n):
    rows = []
    for i, (_, email, country, _, status) in enumerate(common.user_rows(n, seed=99)):
        created = f"2026-01-01 {i // 3600:02d}:{i // 60 % 60:02d}:{i % 60:02d}"
        rows.append((email, country, created, status))
    return rows


def pct(times, p):
    return sorted(times)[int(len(times) * p) - 1]


def measure(indexes):
    path = os.path.join(common.OUT, "p03-commit.db")
    common.copy_db(common.BASE_DB, path)
    con = common.connect(path)
    for sql in indexes:
        con.execute(sql)
    rows = new_rows(N)
    print(f"== {len(indexes)} indexes, {N} rows, {common.load()}")

    io0 = common.io_counters()
    times = []
    for r in rows:
        t0 = time.perf_counter_ns()
        con.execute(INSERT, r)
        times.append(time.perf_counter_ns() - t0)
    io1 = common.io_counters()
    print(f"one transaction per row: median {common.fmt_ns(statistics.median(times))}, "
          f"p99 {common.fmt_ns(pct(times, 0.99))}, max {common.fmt_ns(max(times))}, "
          f"total {common.fmt_ns(sum(times))}")
    print(f"    per row: wchar {(io1['wchar'] - io0['wchar']) // N} bytes, "
          f"write_bytes {(io1['write_bytes'] - io0['write_bytes']) // N} bytes")

    con.execute("DELETE FROM users WHERE id > 1000000")
    io0 = common.io_counters()
    t0 = time.perf_counter_ns()
    con.execute("BEGIN")
    con.executemany(INSERT, rows)
    con.execute("COMMIT")
    elapsed = time.perf_counter_ns() - t0
    io1 = common.io_counters()
    print(f"the same rows in one transaction: total {common.fmt_ns(elapsed)}, "
          f"{common.fmt_ns(elapsed / N)} per row")
    print(f"    per row: wchar {(io1['wchar'] - io0['wchar']) // N} bytes, "
          f"write_bytes {(io1['write_bytes'] - io0['write_bytes']) // N} bytes")
    con.close()
    common.remove_db(path)


def trace(path, count):
    """Insert count rows, one transaction each."""
    con = common.connect(path)
    for r in new_rows(count):
        con.execute(INSERT, r)
    con.close()


if __name__ == "__main__":
    if sys.argv[1:2] == ["trace"]:
        trace(sys.argv[2], int(sys.argv[3]))
    else:
        common.header("part 3: one transaction per row")
        measure([])
        measure(SIX)
