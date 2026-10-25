"""Deleted rows, free pages, page reuse, REINDEX, VACUUM and auto_vacuum."""

import os
import re
import struct
import subprocess
import time

import common
from sqlitefile import DbFile

DELETE = "DELETE FROM users WHERE created_at < '2024-07-01'"
EMAIL_INDEX = "CREATE INDEX users_email ON users(email)"
DELETED_EMAIL = "liam.novak5008@example.net"


def state(con, path, label):
    pc = con.execute("PRAGMA page_count").fetchone()[0]
    fl = con.execute("PRAGMA freelist_count").fetchone()[0]
    print(f"{label}: page_count {pc}, freelist_count {fl}, file {os.path.getsize(path)} bytes")
    for row in con.execute("SELECT name, pageno, ncell, payload, unused FROM dbstat "
                           "WHERE aggregate = TRUE AND name LIKE 'users%'"):
        print("    {}: {} pages, {} cells, {} bytes payload, {} bytes unused".format(*row))


def after_delete(path, secure_delete=1):
    common.copy_db(common.BASE_DB, path)
    con = common.connect(path)
    con.execute(EMAIL_INDEX)
    con.execute(f"PRAGMA secure_delete = {secure_delete}")
    io0 = common.io_counters()
    t0 = time.perf_counter_ns()
    deleted = con.execute(DELETE).rowcount
    elapsed = time.perf_counter_ns() - t0
    wchar = common.io_counters()["wchar"] - io0["wchar"]
    return con, deleted, elapsed, wchar


def delete_and_reuse(path):
    common.copy_db(common.BASE_DB, path)
    con = common.connect(path)
    con.execute(EMAIL_INDEX)
    state(con, path, "before the delete")
    con.close()
    con, deleted, elapsed, wchar = after_delete(path)
    print(f"-- {DELETE}\n    {deleted} rows deleted, {common.fmt_ns(elapsed)}, wchar {wchar}")
    state(con, path, "after the delete")
    rows = [(e, c, time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(common.NEW_USERS_START + i * 30)), s)
            for i, (_, e, c, _, s) in enumerate(common.user_rows(200000, seed=77))]
    con.execute("BEGIN")
    con.executemany("INSERT INTO users (email, country, created_at, status) VALUES (?, ?, ?, ?)", rows)
    con.execute("COMMIT")
    state(con, path, "after 200000 new users")
    con.close()


def deleted_bytes(path):
    print("== is a deleted email still in the file?")
    for sd in (1, 0):
        con, _, _, _ = after_delete(path, sd)
        left = con.execute("SELECT count(*) FROM users WHERE email = ?", (DELETED_EMAIL,)).fetchone()[0]
        con.close()
        with open(path, "rb") as f:
            found = f.read().count(DELETED_EMAIL.encode())
        print(f"secure_delete = {sd}: rows with {DELETED_EMAIL}: {left}, "
              f"copies of the text in the file: {found}")
        db = DbFile(path)
        trunk = db.page(db.freelist_trunk)
        count = struct.unpack(">I", trunk[4:8])[0]
        leaves = [struct.unpack(">I", trunk[8 + 4 * i:12 + 4 * i])[0] for i in range(min(count, 50))]
        nonzero = [sum(1 for b in db.page(p) if b) for p in leaves]
        db.close()
        print(f"    non-zero bytes in {len(leaves)} free pages of 4096 bytes: "
              f"min {min(nonzero)}, max {max(nonzero)}")


def reindex(path):
    con, _, _, _ = after_delete(path)
    con.execute("REINDEX users_email")
    state(con, path, "after the delete and REINDEX users_email")
    con.close()


def vacuum(path):
    print("== VACUUM of the file after the delete")
    times = []
    for _ in range(3):
        con, _, _, _ = after_delete(path)
        con.close()
        t0 = time.perf_counter_ns()
        subprocess.run(["sqlite3", path, "VACUUM"], check=True)
        times.append(time.perf_counter_ns() - t0)
    print(f"VACUUM: {common.spread(times)}, {common.load()}")
    con = common.connect(path)
    state(con, path, "after VACUUM")
    con.close()
    con, _, _, _ = after_delete(path)
    con.close()
    trace = os.path.join(common.OUT, "p09-strace.txt")
    subprocess.run(["strace", "-f", "-y", "-e", "trace=pwrite64,write", "-o", trace,
                    "sqlite3", path, "VACUUM"], check=True)
    written = {}
    with open(trace) as f:
        for line in f:
            m = re.search(r"write\w*\(\d+<([^>]*)>.* = (\d+)$", line)
            if m:
                name = re.sub(r"_[0-9a-f]+", "_...", os.path.basename(m.group(1)))
                written[name] = written.get(name, 0) + int(m.group(2))
    os.remove(trace)
    for name, n in sorted(written.items()):
        print(f"    written by VACUUM to {name}: {n} bytes")


def auto_vacuum():
    print("== auto_vacuum")
    path = os.path.join(common.OUT, "p09-auto.db")
    common.copy_db(common.BASE_DB, path)
    con = common.connect(path)
    for sql in ("PRAGMA auto_vacuum", "PRAGMA auto_vacuum = FULL", "PRAGMA auto_vacuum",
                "VACUUM", "PRAGMA auto_vacuum"):
        print(f"    {sql}: {con.execute(sql).fetchall()}")
    con.close()
    for mode in ("FULL", "INCREMENTAL"):
        common.remove_db(path)
        con = common.connect(path)
        con.execute(f"PRAGMA auto_vacuum = {mode}")
        con.execute(common.SCHEMA)
        con.execute("BEGIN")
        con.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?)", common.user_rows())
        con.execute("COMMIT")
        con.execute(EMAIL_INDEX)
        print(f"-- auto_vacuum = {mode} before the tables, then the same delete")
        con.execute(DELETE)
        state(con, path, f"{mode}, after the delete")
        if mode == "INCREMENTAL":
            con.execute("PRAGMA incremental_vacuum(1000)")
            state(con, path, "after execute('PRAGMA incremental_vacuum(1000)')")
            rows = con.execute("PRAGMA incremental_vacuum(1000)").fetchall()
            state(con, path, f"after the same with fetchall(), {len(rows)} rows")
        con.close()
    common.remove_db(path)


def main():
    common.header("part 9: free pages and VACUUM")
    path = os.path.join(common.OUT, "p09.db")
    delete_and_reuse(path)
    deleted_bytes(path)
    reindex(path)
    vacuum(path)
    common.remove_db(path)
    auto_vacuum()


if __name__ == "__main__":
    main()
