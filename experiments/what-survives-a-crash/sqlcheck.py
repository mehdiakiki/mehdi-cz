"""After a killed sqlite3 run: are all acknowledged rows in the database, and is it consistent?"""

import os
import subprocess
import sys


def main(db, acks_file):
    acked = 0
    for line in open(acks_file) if os.path.exists(acks_file) else []:
        if line.startswith("ok|"):
            acked = int(line.strip().split("|")[1])
    out = subprocess.run(["sqlite3", db, "SELECT count(*) FROM t;", "PRAGMA integrity_check;"],
                         capture_output=True, text=True).stdout.split()
    rows, integrity = int(out[0]), out[1]
    if integrity != "ok":
        print("integrity check failed")
    elif rows < acked:
        print("acknowledged rows missing, integrity ok")
    else:
        print("all acknowledged rows present, integrity ok")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
