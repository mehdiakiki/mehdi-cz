"""Insert one million users in one transaction with 0, 1, 3 and 6 indexes."""

import os
import time

import common

EMAIL = "CREATE INDEX users_email ON users(email)"
THREE = [
    EMAIL,
    "CREATE INDEX users_created ON users(created_at)",
    "CREATE INDEX users_country ON users(country)",
]
SIX = THREE + [
    "CREATE INDEX users_status ON users(status)",
    "CREATE INDEX users_country_created ON users(country, created_at)",
    "CREATE INDEX users_status_created ON users(status, created_at)",
]
BIG_CACHE = -1048576
CONFIGS = [
    ("no index", [], [], None),
    ("1 index (email)", [EMAIL], [], None),
    ("3 indexes", THREE, [], None),
    ("6 indexes", SIX, [], None),
    ("6 indexes created after the insert", [], SIX, None),
    ("1 index (email), cache_size -1048576", [EMAIL], [], BIG_CACHE),
    ("6 indexes, cache_size -1048576", SIX, [], BIG_CACHE),
]
RUNS = 3
PATH = os.path.join(common.OUT, "p03-bulk.db")


def one_run(rows, before, after, cache):
    common.remove_db(PATH)
    con = common.connect(PATH)
    if cache:
        con.execute(f"PRAGMA cache_size = {cache}")
    con.execute(common.SCHEMA)
    for sql in before:
        con.execute(sql)
    io0 = common.io_counters()
    t0 = time.perf_counter_ns()
    con.execute("BEGIN")
    con.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?)", rows)
    con.execute("COMMIT")
    for sql in after:
        con.execute(sql)
    elapsed = time.perf_counter_ns() - t0
    io1 = common.io_counters()
    email_pages = con.execute(
        "SELECT pageno FROM dbstat WHERE aggregate = TRUE AND name = 'users_email'").fetchone()
    con.close()
    return (elapsed, os.path.getsize(PATH), io1["wchar"] - io0["wchar"],
            io1["write_bytes"] - io0["write_bytes"], email_pages[0] if email_pages else 0)


def main():
    common.header("part 3: one million rows in one transaction")
    rows = list(common.user_rows())
    print(f"{len(rows)} rows generated in memory before the timed part, {RUNS} runs per line")
    print("wchar = bytes passed to write(), write_bytes = bytes the kernel counted for the device")
    for name, before, after, cache in CONFIGS:
        runs = [one_run(rows, before, after, cache) for _ in range(RUNS)]
        times = [r[0] for r in runs]
        _, size, wchar, wbytes, email_pages = runs[-1]
        print(f"{name}: {common.spread(times)}")
        print(f"    file {size} bytes, wchar {wchar}, write_bytes {wbytes}, "
              f"users_email {email_pages} pages, {common.load()}")
    common.remove_db(PATH)


if __name__ == "__main__":
    main()
