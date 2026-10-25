"""Drop and rebuild the email index, then break one index entry in a copy and repair it."""

import os
import sys

import common
from sqlitefile import DbFile

ENTRIES = "SELECT email, rowid FROM users INDEXED BY users_email ORDER BY email"


def pages(con):
    pc = con.execute("PRAGMA page_count").fetchone()[0]
    fl = con.execute("PRAGMA freelist_count").fetchone()[0]
    return f"page_count {pc}, freelist_count {fl}"


def digest(con):
    rows = con.execute(ENTRIES).fetchall()
    return f"{len(rows)} entries, digest {common.rows_digest(rows)}"


def query(con, sql, args):
    plan = con.execute("EXPLAIN QUERY PLAN " + sql, args).fetchall()
    print(f"sqlite> {sql.replace('?', repr(args[0]))};")
    print("  plan: " + "; ".join(r[3] for r in plan))
    for row in con.execute(sql, args):
        print("  " + repr(row))


def rebuild(path):
    con = common.connect(path)
    print("index entries:", digest(con))
    print("DROP INDEX users_email;")
    con.execute("DROP INDEX users_email")
    print(" ", pages(con))
    print("CREATE INDEX users_email ON users(email);")
    con.execute("CREATE INDEX users_email ON users(email)")
    print(" ", pages(con))
    print("index entries:", digest(con))
    print("PRAGMA integrity_check:", con.execute("PRAGMA integrity_check").fetchall())
    con.close()


def break_and_repair(path):
    broken = path.replace(".db", "-broken.db")
    common.copy_db(path, broken)
    con = common.connect(broken)
    root = con.execute("SELECT rootpage FROM sqlite_schema WHERE name = 'users_email'").fetchone()[0]
    con.close()

    db = DbFile(broken)
    leaf = db.leftmost_leaf(root)[-1][0]
    _, _, _, (_, _, (email, rowid), offsets, end) = db.index_cell(leaf, 0)
    size = end - offsets[1]
    file_off = (leaf - 1) * db.page_size + offsets[1]
    db.close()
    print(f"index entry ({email!r}, {rowid}) on page {leaf}; "
          f"its rowid is {size} bytes at file offset {file_off}")
    fd = os.open(broken, os.O_WRONLY)
    os.pwrite(fd, (rowid + 1).to_bytes(size, "big", signed=True), file_off)
    os.fsync(fd)
    os.close(fd)
    print(f"wrote {rowid + 1} over it, the table is not changed")

    con = common.connect(broken)
    sql = "SELECT * FROM users WHERE email = ?"
    query(con, "SELECT id, email FROM users WHERE email = ?", (email,))
    query(con, sql, (email,))
    query(con, "SELECT * FROM users NOT INDEXED WHERE email = ?", (email,))
    query(con, "SELECT * FROM users WHERE id = ?", (rowid + 1,))
    print("PRAGMA integrity_check:")
    for (line,) in con.execute("PRAGMA integrity_check"):
        print("  " + line)
    print("REINDEX users_email;")
    con.execute("REINDEX users_email")
    print("PRAGMA integrity_check:", con.execute("PRAGMA integrity_check").fetchall())
    query(con, sql, (email,))
    con.close()
    common.remove_db(broken)


if __name__ == "__main__":
    rebuild(sys.argv[1])
    break_and_repair(sys.argv[1])
