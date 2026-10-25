"""Queries that do not use an available index, the plan SQLite chose, and a fix for each."""

import sys

import common

RUNS = 9


def plan(con, sql, args):
    rows = con.execute("EXPLAIN QUERY PLAN " + sql, args).fetchall()
    return "; ".join(r[3] for r in rows)


def timing(con, sql, args):
    con.execute(sql, args).fetchall()
    one = common.run_times(lambda: con.execute(sql, args).fetchall(), 1)[0]
    batch = 100 if one < 1_000_000 else 1

    def run():
        for _ in range(batch):
            con.execute(sql, args).fetchall()

    return common.spread([t / batch for t in common.run_times(run, RUNS)])


def case(con, label, sql, args=()):
    n = len(con.execute(sql, args).fetchall())
    print(f"{label}\n    {sql}  {args if args else ''}")
    print(f"    plan: {plan(con, sql, args)}")
    print(f"    {n} rows, {timing(con, sql, args)}")


def step(con, sql):
    print(f"-- {sql}")
    con.execute(sql)


def main(path):
    common.header("part 6: when the index is not used, warm cache")
    con = common.connect(path)
    for sql in ("CREATE INDEX users_email ON users(email)",
                "CREATE INDEX users_created ON users(created_at)",
                "CREATE INDEX users_status ON users(status)"):
        step(con, sql)
    print(common.cache_state(path))

    print("== 1. a function on the column")
    q = "SELECT * FROM users WHERE lower(email) = ?"
    case(con, "lower(email) with an index on email", q, ("adam.ali1087@example.net",))
    step(con, "CREATE INDEX users_email_lower ON users(lower(email))")
    case(con, "lower(email) with an index on lower(email)", q, ("adam.ali1087@example.net",))

    print("== 2. LIKE with a prefix")
    case(con, "LIKE, index on email (BINARY)", "SELECT * FROM users WHERE email LIKE ?", ("adam.ali1%",))
    case(con, "GLOB, index on email (BINARY)", "SELECT * FROM users WHERE email GLOB ?", ("adam.ali1*",))
    step(con, "PRAGMA case_sensitive_like = ON")
    case(con, "LIKE with case_sensitive_like = ON", "SELECT * FROM users WHERE email LIKE ?", ("adam.ali1%",))
    step(con, "PRAGMA case_sensitive_like = OFF")
    step(con, "CREATE INDEX users_email_nocase ON users(email COLLATE NOCASE)")
    case(con, "LIKE, index on email COLLATE NOCASE", "SELECT * FROM users WHERE email LIKE ?", ("adam.ali1%",))

    print("== 3. LIKE with a wildcard at the start")
    case(con, "LIKE '%...', index on email COLLATE NOCASE",
         "SELECT * FROM users WHERE email LIKE ?", ("%ali1087@example.net",))

    print("== 4. OR across two columns")
    case(con, "OR, both columns indexed",
         "SELECT * FROM users WHERE email = ? OR created_at = ?",
         ("Adam.Ali1087@example.net", "2025-11-24 03:22:10"))
    case(con, "OR, country has no index",
         "SELECT * FROM users WHERE email = ? OR country = ?", ("Adam.Ali1087@example.net", "IS"))

    print("== 5. types: a text column compared with an integer")
    step(con, "CREATE TABLE logins (user_ref TEXT NOT NULL, at TEXT NOT NULL)")
    step(con, "INSERT INTO logins SELECT CAST(id AS TEXT), created_at FROM users WHERE id % 10 = 0")
    step(con, "CREATE INDEX logins_user ON logins(user_ref)")
    case(con, "integer literal against the text column",
         "SELECT * FROM logins WHERE user_ref = 966670")
    join = ("SELECT logins.at FROM users JOIN logins ON logins.user_ref = {} "
            "WHERE users.email = ?")
    case(con, "join, TEXT column = INTEGER column", join.format("users.id"), ("msingh5713@example.com",))
    case(con, "join with a CAST", join.format("CAST(users.id AS TEXT)"), ("msingh5713@example.com",))

    print("== 6. low selectivity")
    q = "SELECT count(email) FROM users WHERE status = ?"
    case(con, "status = 'inactive', no statistics", q, ("inactive",))
    case(con, "status = 'inactive', NOT INDEXED",
         "SELECT count(email) FROM users NOT INDEXED WHERE status = ?", ("inactive",))
    case(con, "status = 'active', no statistics", q, ("active",))
    case(con, "status = 'active', NOT INDEXED",
         "SELECT count(email) FROM users NOT INDEXED WHERE status = ?", ("active",))
    step(con, "ANALYZE")
    con.close()
    print("-- a new connection, so that it plans with the new statistics")
    con = common.connect(path)
    case(con, "status = 'inactive', after ANALYZE", q, ("inactive",))
    case(con, "status = 'active', after ANALYZE", q, ("active",))
    con.close()
    print(common.load())


if __name__ == "__main__":
    main(sys.argv[1])
