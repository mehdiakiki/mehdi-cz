"""Insert documents and their search entries until the process is killed.

Modes: "two" commits the document and its search entry in two transactions,
"one" commits both in one transaction, "trigger" inserts only the document
and lets the FTS5 triggers write the search entry.
"""

import random
import sys

import common

WORDS = [
    "index", "table", "page", "query", "plan", "row", "column", "commit",
    "journal", "cache", "file", "disk", "copy", "order", "range", "scan",
    "search", "value", "email", "user", "date", "count", "write", "read",
    "delete", "insert", "update", "vacuum", "tree", "leaf", "root", "key",
    "time", "sort", "match", "token", "text", "word", "trigger", "sync",
]
LIMIT = 100000


def document(i):
    rng = random.Random(i)
    title = " ".join(rng.choice(WORDS) for _ in range(4))
    body = " ".join(rng.choice(WORDS) for _ in range(30)) + f" tok{i}"
    return title, body


def main(path, mode):
    con = common.connect(path)
    start = con.execute("SELECT coalesce(max(id), 0) + 1 FROM docs").fetchone()[0]
    print("ready", flush=True)
    for i in range(start, start + LIMIT):
        title, body = document(i)
        if mode == "two":
            con.execute("INSERT INTO docs VALUES (?, ?, ?)", (i, title, body))
            con.execute("INSERT INTO docs_fts (rowid, title, body) VALUES (?, ?, ?)",
                        (i, title, body))
        elif mode == "one":
            con.execute("BEGIN")
            con.execute("INSERT INTO docs VALUES (?, ?, ?)", (i, title, body))
            con.execute("INSERT INTO docs_fts (rowid, title, body) VALUES (?, ?, ?)",
                        (i, title, body))
            con.execute("COMMIT")
        else:
            con.execute("INSERT INTO docs VALUES (?, ?, ?)", (i, title, body))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
