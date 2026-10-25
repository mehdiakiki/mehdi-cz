"""Time three queries with a warm and with a cold page cache, and print their plans."""

import sys
import time

import common

QUERIES = [
    ("email lookup", "SELECT * FROM users WHERE email = ?", ("Adam.Ali1087@example.net",)),
    ("one day range", "SELECT * FROM users WHERE created_at BETWEEN ? AND ?",
     ("2025-03-01 00:00:00", "2025-03-01 23:59:59")),
    ("latest three", "SELECT id, email FROM users ORDER BY created_at DESC LIMIT 3", ()),
]
WARM_RUNS = 15
BATCH = 1000
COLD_RUNS = 7


def warm(path, sql, args):
    con = common.connect(path)
    rows = con.execute(sql, args).fetchall()
    t0 = time.perf_counter_ns()
    con.execute(sql, args).fetchall()
    one = time.perf_counter_ns() - t0
    batch = BATCH if one < 1_000_000 else 1

    def run():
        for _ in range(batch):
            con.execute(sql, args).fetchall()

    times = [t / batch for t in common.run_times(run, WARM_RUNS)]
    con.close()
    return len(rows), batch, times


def cold(path, sql, args):
    times = []
    for _ in range(COLD_RUNS):
        con = common.connect(path)
        con.execute("SELECT count(*) FROM sqlite_schema").fetchall()
        common.evict(path)
        before = common.resident_bytes(path)
        t0 = time.perf_counter_ns()
        con.execute(sql, args).fetchall()
        times.append(time.perf_counter_ns() - t0)
        con.close()
    return before, times


def main(path, label):
    print(f"== {label}: {common.load()}, {common.cache_state(path)}")
    con = common.connect(path)
    for name, sql, args in QUERIES:
        plan = "; ".join(r[3] for r in con.execute("EXPLAIN QUERY PLAN " + sql, args))
        print(f"{name}: {plan}")
    con.close()
    for name, sql, args in QUERIES:
        n, batch, times = warm(path, sql, args)
        how = f"per query, {batch} queries per run" if batch > 1 else "one query per run"
        print(f"{name}, warm, {n} rows: {common.spread(times)} ({how})")
    for name, sql, args in QUERIES:
        before, times = cold(path, sql, args)
        print(f"{name}, cold ({before} bytes cached before each run): {common.spread(times)}")
    print(f"after the cold runs: {common.cache_state(path)}, {common.load()}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
