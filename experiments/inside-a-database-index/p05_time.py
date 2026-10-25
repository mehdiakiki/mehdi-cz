"""Time lookups and ranges with the index (email) and the covering index (email, status)."""

import random
import sys
import time

import common

INDEXES = ["users_email", "users_email_status"]
ONE = "SELECT email, status FROM users INDEXED BY {} WHERE email = ?"
RANGE = "SELECT email, status FROM users INDEXED BY {} WHERE email >= ? AND email < ?"
RANGES = [("maria", "marib"), ("m", "n")]
PROBES = 10000
RUNS = 9
COLD_RUNS = 5


def probes(con):
    emails = [r[0] for r in con.execute("SELECT email FROM users")]
    return random.Random(5).sample(emails, PROBES)


def lookups(con, sql, emails):
    for e in emails:
        con.execute(sql, (e,)).fetchall()


def cold(path, sql, args):
    times = []
    for _ in range(COLD_RUNS):
        con = common.connect(path)
        con.execute("SELECT count(*) FROM sqlite_schema").fetchall()
        common.evict(path)
        t0 = time.perf_counter_ns()
        con.execute(sql, args).fetchall()
        times.append(time.perf_counter_ns() - t0)
        con.close()
    return common.spread(times)


def main(path):
    common.header("part 5: covering index, warm cache unless it says cold")
    print(common.cache_state(path))
    con = common.connect(path)
    emails = probes(con)
    for idx in INDEXES:
        sql = ONE.format(idx)
        plan = con.execute("EXPLAIN QUERY PLAN " + sql, (emails[0],)).fetchone()[3]
        lookups(con, sql, emails)
        times = [t / PROBES for t in common.run_times(lambda: lookups(con, sql, emails), RUNS)]
        print(f"one row, {idx}: {plan}\n    {common.spread(times)} per lookup, {PROBES} lookups per run")
    for lo, hi in RANGES:
        for idx in INDEXES:
            sql = RANGE.format(idx)
            n = len(con.execute(sql, (lo, hi)).fetchall())
            times = common.run_times(lambda: con.execute(sql, (lo, hi)).fetchall(), RUNS)
            print(f"range {lo!r} to {hi!r}, {n} rows, {idx}: {common.spread(times)}")
        sql = RANGE.replace("INDEXED BY {}", "NOT INDEXED")
        times = common.run_times(lambda: con.execute(sql, (lo, hi)).fetchall(), RUNS)
        print(f"range {lo!r} to {hi!r}, NOT INDEXED (full table scan): {common.spread(times)}")
    con.close()
    for idx in INDEXES:
        print(f"cold, one row, {idx}: {cold(path, ONE.format(idx), (emails[0],))}")
    for idx in INDEXES:
        print(f"cold, range 'm' to 'n', {idx}: {cold(path, RANGE.format(idx), ('m', 'n'))}")
    print(common.load())


if __name__ == "__main__":
    main(sys.argv[1])
