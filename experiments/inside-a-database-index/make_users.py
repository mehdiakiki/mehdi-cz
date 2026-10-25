"""Build out/users.db: one million generated users, no index, and print a summary."""

import os
import time

import common


def main():
    os.makedirs(common.OUT, exist_ok=True)
    t0 = time.perf_counter()
    common.build_users(common.BASE_DB)
    elapsed = time.perf_counter() - t0
    con = common.connect(common.BASE_DB)
    rows = con.execute("SELECT * FROM users ORDER BY id")
    print(f"rows digest: {common.rows_digest(rows)}")
    print("count, first and last created_at:",
          con.execute("SELECT count(*), min(created_at), max(created_at) FROM users").fetchone())
    print("status:", con.execute(
        "SELECT status, count(*) FROM users GROUP BY status ORDER BY 2 DESC").fetchall())
    print("countries:", con.execute(
        "SELECT country, count(*) FROM users GROUP BY country ORDER BY 2 DESC").fetchall())
    print("first rows:")
    for r in con.execute("SELECT * FROM users ORDER BY id LIMIT 3"):
        print("  ", r)
    con.close()
    print(f"file size: {os.path.getsize(common.BASE_DB)} bytes, built in {elapsed:.1f} s")


if __name__ == "__main__":
    main()
