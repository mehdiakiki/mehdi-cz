"""Time N single-row transactions with the sqlite3 command line tool and count disk flushes."""

import os
import subprocess
import sys
import time

DISK = "/sys/block/nvme0n1/stat"


def flushes():
    with open(DISK) as f:
        return int(f.read().split()[15])


def main(directory, journal_mode, synchronous, count):
    db = os.path.join(directory, "bench.db")
    for suffix in ("", "-journal", "-wal", "-shm"):
        if os.path.exists(db + suffix):
            os.remove(db + suffix)
    setup = f"PRAGMA journal_mode={journal_mode};\nCREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT);\n"
    subprocess.run(["sqlite3", db], input=setup, text=True, check=True, stdout=subprocess.DEVNULL)
    script = f"PRAGMA synchronous={synchronous};\n" + "INSERT INTO t(v) VALUES('a row of text');\n" * count
    before, start = flushes(), time.monotonic()
    subprocess.run(["sqlite3", db], input=script, text=True, check=True)
    seconds, after = time.monotonic() - start, flushes()
    rows = subprocess.run(["sqlite3", db, "SELECT count(*) FROM t;"], capture_output=True, text=True).stdout.strip()
    print(f"  journal_mode={journal_mode:<6} synchronous={synchronous:<6} {count:>6} transactions: "
          f"{count / seconds:>7.0f} per second, {1000 * seconds / count:6.3f} ms each, "
          f"{(after - before) / count:4.2f} disk flushes each, {rows} rows")
    for suffix in ("", "-journal", "-wal", "-shm"):
        if os.path.exists(db + suffix):
            os.remove(db + suffix)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]))
