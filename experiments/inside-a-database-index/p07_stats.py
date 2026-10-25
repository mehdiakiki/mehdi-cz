"""Plans and timings of one query before ANALYZE, after it, and after the data changes."""

import subprocess
import sys

import common
from sqlitefile import record

RUNS = 9
Q = "SELECT count(email) FROM users WHERE country = ? AND status = ?"


def plan(con, sql, args):
    return "; ".join(r[3] for r in con.execute("EXPLAIN QUERY PLAN " + sql, args))


def show(con, label, args, sql=Q):
    con.execute(sql, args).fetchall()
    times = common.run_times(lambda: con.execute(sql, args).fetchall(), RUNS)
    n = con.execute(sql, args).fetchone()[0]
    print(f"{label} {args}: {plan(con, sql, args)}\n    count {n}, {common.spread(times)}")


def stat_tables(con):
    for row in con.execute("SELECT tbl, idx, stat FROM sqlite_stat1 ORDER BY idx"):
        print("    sqlite_stat1:", "|".join(row))
    for idx, neq, sample in con.execute(
            "SELECT idx, neq, sample FROM sqlite_stat4 WHERE idx = 'users_status'"):
        value, rowid = record(sample, 0)[2]
        print(f"    sqlite_stat4: {idx} sample ({value!r}, rowid {rowid}) nEq {neq}")


def main(path):
    common.header("part 7: planner statistics, warm cache")
    con = common.connect(path)
    for sql in ("CREATE INDEX users_country ON users(country)",
                "CREATE INDEX users_status ON users(status)"):
        print("--", sql)
        con.execute(sql)

    print("== 1. no statistics")
    show(con, "planner's choice", ("IS", "inactive"))
    show(con, "forced users_country", ("IS", "inactive"),
         Q.replace("FROM users", "FROM users INDEXED BY users_country"))
    show(con, "planner's choice", ("US", "active"))
    print("    PRAGMA optimize(0xffff), debug mode:",
          con.execute("PRAGMA optimize(0xffff)").fetchall())

    print("== 2. ANALYZE in the same connection, statement cache kept")
    con.execute("ANALYZE")
    stat_tables(con)
    show(con, "same connection", ("IS", "inactive"))
    show(con, "same connection", ("US", "active"))
    con.close()
    con = common.connect(path)
    show(con, "new connection", ("IS", "inactive"))
    show(con, "new connection", ("US", "active"))

    print("== 3. the data changes, the statistics do not")
    sql = ("UPDATE users SET status = 'closed' "
           "WHERE status = 'inactive' AND created_at < '2025-12-01'")
    print("--", sql)
    con.execute(sql)
    print("    rows:", con.execute("SELECT count(*) FROM users").fetchone()[0],
          dict(con.execute("SELECT status, count(*) FROM users GROUP BY status")))
    con.close()
    app = common.connect(path)
    show(app, "app connection, old statistics", ("US", "inactive"))
    show(app, "forced users_status", ("US", "inactive"),
         Q.replace("FROM users", "FROM users INDEXED BY users_status"))
    print("    PRAGMA optimize(0xffff), debug mode:",
          app.execute("PRAGMA optimize(0xffff)").fetchall())
    app.execute("PRAGMA optimize")
    show(app, "after PRAGMA optimize", ("US", "inactive"))

    print("== 4. ANALYZE in another process, the app connection stays open")
    subprocess.run(["sqlite3", path, "ANALYZE"], check=True)
    show(app, "app connection", ("US", "inactive"))
    other = common.connect(path)
    show(other, "new connection", ("US", "inactive"))
    other.close()
    app.execute("ANALYZE sqlite_schema")
    show(app, "app connection after ANALYZE sqlite_schema", ("US", "inactive"))

    print("== 5. many fewer rows")
    for keep in (10, 20):
        sql = f"DELETE FROM users WHERE id % {keep} <> 0"
        print("--", sql)
        app.execute(sql)
        print("    rows:", app.execute("SELECT count(*) FROM users").fetchone()[0])
        print("    PRAGMA optimize(0xffff), debug mode:",
              app.execute("PRAGMA optimize(0xffff)").fetchall())
    app.close()
    print(common.load())


if __name__ == "__main__":
    main(sys.argv[1])
