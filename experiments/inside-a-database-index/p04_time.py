"""Time queries on (country, created_at) against other indexes, and offset against cursor pages."""

import sys

import common

RUNS = 15
CASES = [
    ("country = 'DE', index (country, created_at)",
     "SELECT count(email) FROM users INDEXED BY users_country_created WHERE country = 'DE'"),
    ("country = 'DE' AND created_at > ..., index (country, created_at)",
     "SELECT count(email) FROM users INDEXED BY users_country_created "
     "WHERE country = 'DE' AND created_at > '2025-12-01'"),
    ("country = 'DE' AND created_at > ..., index (created_at, country)",
     "SELECT count(email) FROM users INDEXED BY users_created_country "
     "WHERE country = 'DE' AND created_at > '2025-12-01'"),
    ("created_at > ..., skip-scan on (country, created_at)",
     "SELECT count(email) FROM users INDEXED BY users_country_created "
     "WHERE created_at > '2025-12-01'"),
    ("created_at > ..., full table scan",
     "SELECT count(email) FROM users NOT INDEXED WHERE created_at > '2025-12-01'"),
    ("newest 3 of DE, index (country, created_at)",
     "SELECT id, email FROM users INDEXED BY users_country_created "
     "WHERE country = 'DE' ORDER BY created_at DESC LIMIT 3"),
    ("newest 3 of DE, index (country) and a sort",
     "SELECT id, email FROM users INDEXED BY users_country "
     "WHERE country = 'DE' ORDER BY created_at DESC LIMIT 3"),
]
PAGE = ("SELECT id, email, created_at FROM users WHERE country = 'DE' "
        "ORDER BY created_at DESC, id DESC LIMIT 20")
OFFSET_PAGE = PAGE + " OFFSET ?"
CURSOR_PAGE = ("SELECT id, email, created_at FROM users WHERE country = 'DE' "
               "AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 20")
DEPTHS = [0, 2000, 20000, 60000]


def timed(con, sql, args=()):
    con.execute(sql, args).fetchall()
    return common.spread(common.run_times(lambda: con.execute(sql, args).fetchall(), RUNS))


def main(path):
    common.header("part 4: timings, warm cache, after ANALYZE")
    print(common.cache_state(path))
    con = common.connect(path)
    for name, sql in CASES:
        plan = "; ".join(r[3] for r in con.execute("EXPLAIN QUERY PLAN " + sql))
        print(f"{name}\n    plan: {plan}\n    {timed(con, sql)}")
    print("== pages of 20 users of DE, newest first")
    print("offset plan: " + "; ".join(r[3] for r in con.execute("EXPLAIN QUERY PLAN " + OFFSET_PAGE, (0,))))
    print("cursor plan: " + "; ".join(r[3] for r in con.execute("EXPLAIN QUERY PLAN " + CURSOR_PAGE, ("", 0))))
    for depth in DEPTHS:
        rows = con.execute(OFFSET_PAGE, (depth,)).fetchall()
        if depth:
            last = con.execute(OFFSET_PAGE.replace("LIMIT 20", "LIMIT 1"), (depth - 1,)).fetchone()
            same = con.execute(CURSOR_PAGE, (last[2], last[0])).fetchall() == rows
            cursor = timed(con, CURSOR_PAGE, (last[2], last[0]))
        else:
            same, cursor = True, timed(con, PAGE)
        print(f"rows {depth} to {depth + 19}: offset {timed(con, OFFSET_PAGE, (depth,))}")
        print(f"    cursor {cursor}, same rows: {same}")
    con.close()
    print(common.load())


if __name__ == "__main__":
    main(sys.argv[1])
