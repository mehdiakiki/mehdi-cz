"""Insert the same one million keys into an indexed column in sorted and in shuffled order."""

import os
import random
import sys
import time

import common

N = 1_000_000
RUNS = 3
PATH = os.path.join(common.OUT, "p03-order.db")
KEYS_DB = os.path.join(common.OUT, "p03-keys.db")


def keys():
    ordered = [f"{i:016d}" for i in range(N)]
    shuffled = ordered[:]
    random.Random(7).shuffle(shuffled)
    return ordered, shuffled


def one_run(ks, cache):
    common.remove_db(PATH)
    con = common.connect(PATH)
    if cache:
        con.execute(f"PRAGMA cache_size = {cache}")
    con.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, k TEXT NOT NULL)")
    con.execute("CREATE INDEX t_k ON t(k)")
    io0 = common.io_counters()
    t0 = time.perf_counter_ns()
    con.execute("BEGIN")
    con.executemany("INSERT INTO t(k) VALUES (?)", ((k,) for k in ks))
    con.execute("COMMIT")
    elapsed = time.perf_counter_ns() - t0
    io1 = common.io_counters()
    pages, unused = con.execute(
        "SELECT pageno, unused FROM dbstat WHERE aggregate = TRUE AND name = 't_k'").fetchone()
    con.close()
    return elapsed, io1["wchar"] - io0["wchar"], pages, unused


def timings():
    common.header("part 3: the same keys, sorted or shuffled")
    ordered, shuffled = keys()
    print(f"{N} keys of 16 characters, {RUNS} runs per line")
    for cache in (None, -1048576):
        for name, ks in (("sorted", ordered), ("shuffled", shuffled)):
            runs = [one_run(ks, cache) for _ in range(RUNS)]
            _, wchar, pages, unused = runs[-1]
            label = f"{name}, cache_size {cache if cache else 'default (-2000)'}"
            print(f"{label}: {common.spread([r[0] for r in runs])}")
            print(f"    wchar {wchar}, index t_k {pages} pages, {unused} bytes unused, {common.load()}")
    common.remove_db(PATH)
    con = common.connect(PATH)
    con.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, k TEXT NOT NULL)")
    con.execute("BEGIN")
    con.executemany("INSERT INTO t(k) VALUES (?)", ((k,) for k in shuffled))
    con.execute("COMMIT")
    con.execute("CREATE INDEX t_k ON t(k)")
    pages, unused = con.execute(
        "SELECT pageno, unused FROM dbstat WHERE aggregate = TRUE AND name = 't_k'").fetchone()
    con.close()
    print(f"CREATE INDEX after the insert: index t_k {pages} pages, {unused} bytes unused")
    common.remove_db(PATH)


def source_tables():
    """Write the sorted and the shuffled keys into two tables of out/p03-keys.db."""
    ordered, shuffled = keys()
    common.remove_db(KEYS_DB)
    con = common.connect(KEYS_DB)
    for name, ks in (("sorted_keys", ordered), ("shuffled_keys", shuffled)):
        con.execute(f"CREATE TABLE {name} (k TEXT NOT NULL)")
        con.execute("BEGIN")
        con.executemany(f"INSERT INTO {name} VALUES (?)", ((k,) for k in ks))
        con.execute("COMMIT")
    con.close()


if __name__ == "__main__":
    if sys.argv[1:] == ["sources"]:
        source_tables()
    else:
        timings()
