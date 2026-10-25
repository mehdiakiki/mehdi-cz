"""Partial and expression indexes: size, query time, which queries can use them, write cost."""

import os
import sqlite3
import sys
import time

import common

RUNS = 15
FULL = "CREATE INDEX users_status_created ON users(status, created_at)"
PARTIAL = "CREATE INDEX users_active_created ON users(created_at) WHERE status = 'active'"
LOWER = "CREATE INDEX users_email_lower ON users(lower(email))"
PLAN_JSON = "CREATE INDEX users_plan ON users(json_extract(profile, '$.plan'))"


def plan(con, sql, args=()):
    try:
        return "; ".join(r[3] for r in con.execute("EXPLAIN QUERY PLAN " + sql, args))
    except sqlite3.OperationalError as e:
        return f"error: {e}"


def timed(con, sql, args):
    con.execute(sql, args).fetchall()
    return common.spread(common.run_times(lambda: con.execute(sql, args).fetchall(), RUNS))


def queries(path):
    con = common.connect(path)
    for sql in (FULL, PARTIAL):
        print("--", sql)
        con.execute(sql)
    for name, pages in con.execute(
            "SELECT name, pageno FROM dbstat WHERE aggregate = TRUE AND name LIKE 'users%'"):
        print(f"    {name}: {pages} pages")

    print("== the active users created after a date")
    q = ("SELECT id, email FROM users INDEXED BY {} "
         "WHERE status = 'active' AND created_at > ?")
    for idx in ("users_status_created", "users_active_created"):
        sql = q.format(idx)
        n = len(con.execute(sql, ("2025-12-01",)).fetchall())
        print(f"{idx}: {plan(con, sql, ('2025-12-01',))}\n    {n} rows, {timed(con, sql, ('2025-12-01',))}")

    print("== which WHERE clauses can use the partial index (INDEXED BY users_active_created)")
    for where in ("status = 'active' AND created_at > '2025-12-01'",
                  "created_at > '2025-12-01'",
                  "status IN ('active') AND created_at > '2025-12-01'",
                  "status = 'active' COLLATE NOCASE AND created_at > '2025-12-01'",
                  "status NOT IN ('inactive', 'suspended') AND created_at > '2025-12-01'",
                  "status = ? AND created_at > '2025-12-01'"):
        sql = f"SELECT count(*) FROM users INDEXED BY users_active_created WHERE {where}"
        args = ("active",) if "?" in where else ()
        print(f"    WHERE {where}{'  (bound: active)' if args else ''}\n        {plan(con, sql, args)}")

    print("-- DROP INDEX users_status_created")
    con.execute("DROP INDEX users_status_created")
    sql = "SELECT id, email FROM users WHERE status = ? AND created_at > ?"
    for value in ("active", "suspended"):
        args = (value, "2025-12-01")
        print(f"bound parameter {args}: {plan(con, sql, args)}\n    {timed(con, sql, args)}")

    print("== expression index on lower(email)")
    print("--", LOWER)
    con.execute(LOWER)
    for where in ("lower(email) = 'adam.ali1087@example.net'",
                  "LOWER( users.email ) = 'adam.ali1087@example.net'",
                  "lower(email) = lower('Adam.Ali1087@example.net')",
                  "lower(trim(email)) = 'adam.ali1087@example.net'",
                  "email = 'adam.ali1087@example.net' COLLATE NOCASE",
                  "lower(email) LIKE 'adam.ali1%'",
                  "lower(email) GLOB 'adam.ali1*'"):
        print(f"    WHERE {where}\n        {plan(con, 'SELECT id FROM users WHERE ' + where)}")

    print("== expression index on a JSON field")
    for sql in ("ALTER TABLE users ADD COLUMN profile TEXT",
                "UPDATE users SET profile = json_object('plan', CASE WHEN id % 50 = 0 THEN 'team' "
                "WHEN id % 10 = 0 THEN 'pro' ELSE 'free' END)",
                PLAN_JSON):
        print("--", sql)
        con.execute(sql)
    for where in ("json_extract(profile, '$.plan') = 'team'",
                  "profile ->> '$.plan' = 'team'",
                  "json_extract(profile, '$.\"plan\"') = 'team'"):
        sql = "SELECT count(*) FROM users WHERE " + where
        n = con.execute(sql).fetchone()[0]
        print(f"    WHERE {where}\n        {plan(con, sql)}, count {n}, {timed(con, sql, ())}")
    con.close()


def new_rows(n):
    rows = []
    for i, (_, email, country, _, status) in enumerate(common.user_rows(n, seed=88)):
        created = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(common.NEW_USERS_START + i * 30))
        rows.append((email, country, created, status))
    return rows


def write_cost():
    print("== 100000 new users in one transaction, into the table of one million rows")
    rows = new_rows(100000)
    path = os.path.join(common.OUT, "p08-write.db")
    for name, sql in (("no extra index", None), ("full (status, created_at)", FULL),
                      ("partial (created_at) WHERE status = 'active'", PARTIAL),
                      ("expression lower(email)", LOWER)):
        times = []
        for _ in range(3):
            common.copy_db(common.BASE_DB, path)
            con = common.connect(path)
            if sql:
                con.execute(sql)
            io0 = common.io_counters()
            t0 = time.perf_counter_ns()
            con.execute("BEGIN")
            con.executemany("INSERT INTO users (email, country, created_at, status) "
                            "VALUES (?, ?, ?, ?)", rows)
            con.execute("COMMIT")
            times.append(time.perf_counter_ns() - t0)
            wchar = common.io_counters()["wchar"] - io0["wchar"]
            con.close()
        print(f"{name}: {common.spread(times)}, wchar {wchar}, {common.load()}")
    common.remove_db(path)


if __name__ == "__main__":
    common.header("part 8: partial and expression indexes, warm cache")
    queries(sys.argv[1])
    write_cost()
