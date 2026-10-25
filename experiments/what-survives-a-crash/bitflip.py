"""Flip one bit in the middle of four kinds of file and see which reader notices."""

import os
import subprocess
import sys
import zlib


def flip(path, offset, bit=0):
    with open(path, "r+b") as f:
        f.seek(offset)
        byte = f.read(1)[0]
        f.seek(offset)
        f.write(bytes([byte ^ (1 << bit)]))
    return byte, byte ^ (1 << bit)


def run(cmd, **kwargs):
    out = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    return (out.stdout + out.stderr).strip()


def log_case(applog, d):
    path = os.path.join(d, "log")
    run([applog, "append", path, "20", "nosync"])
    data = open(path, "rb").read()
    offsets, pos = [], 0
    while pos < len(data):
        offsets.append(pos)
        pos += 8 + int.from_bytes(data[pos:pos + 4], "little")
    target = offsets[10] + 8 + 100
    old, new = flip(path, target)
    damaged = open(path, "rb").read()
    intact = sum(1 for start in offsets[11:]
                 if zlib.crc32(damaged[start:start + 4] + damaged[start + 8:start + 8 + int.from_bytes(damaged[start:start + 4], "little")])
                 == int.from_bytes(damaged[start + 4:start + 8], "little"))
    print(f"== the log of part 8: 20 records, {len(data)} bytes; bit 0 flipped at offset {target}, inside record 10")
    print(f"  byte {old:#04x} became {new:#04x}")
    print(f"  records after record 10 whose CRC is still correct: {intact}")
    print("  applog recover: " + run([applog, "recover", path]))


def sqlite_case(d):
    db = os.path.join(d, "bank.db")
    rows = "".join(f"INSERT INTO accounts VALUES({i}, 'account {i:04}', 1000);\n" for i in range(1000))
    subprocess.run(["sqlite3", db], input="CREATE TABLE accounts(id INTEGER PRIMARY KEY, name TEXT, balance INTEGER);\n"
                   + "BEGIN;\n" + rows + "COMMIT;\n", text=True, check=True)
    data = open(db, "rb").read()
    target = data.index(b"account 0500") + len("account ")
    old, new = flip(db, target, 1)
    print(f"== a SQLite database: 1000 rows, {len(data)} bytes; bit 1 flipped at offset {target}, in the name of row 500")
    print(f"  byte {old:#04x} ({chr(old)}) became {new:#04x} ({chr(new)})")
    print("  SELECT name, balance WHERE id = 500: " + run(["sqlite3", db, "SELECT name, balance FROM accounts WHERE id = 500;"]))
    print("  PRAGMA integrity_check: " + run(["sqlite3", db, "PRAGMA integrity_check;"]))


def gzip_case(d):
    text = os.path.join(d, "notes.txt")
    with open(text, "w") as f:
        for i in range(5000):
            f.write(f"line {i:05}: the quick brown fox jumps over the lazy dog\n")
    subprocess.run(["gzip", "-9", "-k", text], check=True)
    gz = text + ".gz"
    size = os.path.getsize(gz)
    old, new = flip(gz, size // 2)
    print(f"== a gzip file: {size} bytes; bit 0 flipped at offset {size // 2}")
    print(f"  byte {old:#04x} became {new:#04x}")
    print("  gzip -t: " + run(["gzip", "-t", gz]))


def text_case(d):
    text = os.path.join(d, "notes.txt")
    original = open(text, "rb").read()
    target = len(original) // 2
    while not chr(original[target]).isdigit():
        target += 1
    old, new = flip(text, target)
    changed = open(text, "rb").read()
    line = changed[:target].count(b"\n")
    print(f"== the plain text file: {len(original)} bytes; bit 0 flipped at offset {target}")
    print(f"  byte {old:#04x} ({chr(old)}) became {new:#04x} ({chr(new)})")
    print(f"  line {line + 1} before: {original.splitlines()[line].decode()}")
    print(f"  line {line + 1} after:  {changed.splitlines()[line].decode()}")
    print(f"  wc -l: {run(['wc', '-l', text]).split()[0]} lines, the same as before, and no tool reports anything")


def main(applog, d):
    log_case(applog, d)
    sqlite_case(d)
    gzip_case(d)
    text_case(d)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]), sys.argv[2])
