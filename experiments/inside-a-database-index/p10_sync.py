"""Kill the writer many times in each mode, then count documents missing from the search index."""

import os
import random
import sqlite3
import subprocess
import sys
import time

import common

KILLS = 200
WRITER = os.path.join(common.HERE, "p10_writer.py")
SCHEMA = [
    "CREATE TABLE docs (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL)",
    "CREATE VIRTUAL TABLE docs_fts USING fts5(title, body, content='docs', content_rowid='id')",
]
TRIGGERS = [
    """CREATE TRIGGER docs_ai AFTER INSERT ON docs BEGIN
  INSERT INTO docs_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
END""",
    """CREATE TRIGGER docs_ad AFTER DELETE ON docs BEGIN
  INSERT INTO docs_fts(docs_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);
END""",
    """CREATE TRIGGER docs_au AFTER UPDATE ON docs BEGIN
  INSERT INTO docs_fts(docs_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);
  INSERT INTO docs_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
END""",
]
MISSING = ("SELECT count(*) FROM docs WHERE NOT EXISTS "
           "(SELECT 1 FROM docs_fts WHERE docs_fts MATCH 'tok' || docs.id)")


def integrity(con):
    try:
        con.execute("INSERT INTO docs_fts(docs_fts, rank) VALUES ('integrity-check', 1)")
        return "ok"
    except sqlite3.DatabaseError as e:
        return f"error: {e}"


def report(con, label):
    docs = con.execute("SELECT count(*) FROM docs").fetchone()[0]
    missing = con.execute(MISSING).fetchone()[0]
    print(f"    {label}: {docs} documents, {missing} not found in the search index, "
          f"integrity-check: {integrity(con)}")


def kill_cycles(path, mode, rng):
    for _ in range(KILLS):
        p = subprocess.Popen([sys.executable, WRITER, path, mode], stdout=subprocess.PIPE)
        p.stdout.readline()
        time.sleep(rng.uniform(0.0, 0.05))
        p.kill()
        p.wait()
        p.stdout.close()


def run_mode(mode):
    path = os.path.join(common.OUT, f"p10-{mode}.db")
    common.remove_db(path)
    con = common.connect(path)
    for sql in SCHEMA + (TRIGGERS if mode == "trigger" else []):
        con.execute(sql)
    con.close()
    t0 = time.perf_counter()
    kill_cycles(path, mode, random.Random(10))
    print(f"== mode {mode}: {KILLS} kills with SIGKILL in {time.perf_counter() - t0:.1f} s")
    con = common.connect(path)
    report(con, "after the kills")
    if mode == "two":
        t0 = time.perf_counter_ns()
        con.execute("INSERT INTO docs_fts(docs_fts) VALUES ('rebuild')")
        print(f"    rebuild: {common.fmt_ns(time.perf_counter_ns() - t0)}")
        report(con, "after rebuild")
    if mode == "trigger":
        drift(con)
    con.close()
    common.remove_db(path)


def drift(con):
    print("    -- an UPDATE that does not go through the triggers")
    old = con.execute("SELECT body FROM docs WHERE id = 1").fetchone()[0]
    word = old.split()[0]
    for sql in ("DROP TRIGGER docs_au",
                "UPDATE docs SET body = 'replaced text tok1' WHERE id = 1"):
        print(f"    {sql}")
        con.execute(sql)
    found = con.execute("SELECT rowid, body FROM docs_fts WHERE docs_fts MATCH ? AND rowid = 1",
                        (word,)).fetchall()
    print(f"    search for {word!r} still returns: {found}")
    print(f"    integrity-check: {integrity(con)}")
    con.execute("INSERT INTO docs_fts(docs_fts) VALUES ('rebuild')")
    found = con.execute("SELECT rowid FROM docs_fts WHERE docs_fts MATCH ? AND rowid = 1",
                        (word,)).fetchall()
    print(f"    after rebuild, search for {word!r} returns: {found}, integrity-check: {integrity(con)}")


if __name__ == "__main__":
    common.header("part 10: a search index kept in sync, killed with SIGKILL")
    for m in ("two", "one", "trigger"):
        run_mode(m)
    print(common.load())
