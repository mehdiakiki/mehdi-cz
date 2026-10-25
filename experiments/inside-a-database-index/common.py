"""Shared helpers: the generated users table, timing and page cache checks."""

import calendar
import hashlib
import os
import platform
import random
import shutil
import sqlite3
import statistics
import subprocess
import time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
BASE_DB = os.path.join(OUT, "users.db")
SEED = 20260702
N_USERS = 1_000_000

FIRST = [
    "anna", "maria", "john", "james", "lucas", "sofia", "emma", "noah",
    "liam", "olivia", "mia", "elena", "david", "daniel", "laura", "paul",
    "sara", "omar", "yuki", "chen", "priya", "arjun", "ines", "pedro",
    "lena", "jonas", "nina", "ivan", "marta", "hugo", "alice", "leo",
    "zoe", "adam", "eva", "tom", "julia", "karim", "aisha", "felix",
]
LAST = [
    "smith", "garcia", "muller", "rossi", "silva", "kim", "tanaka", "novak",
    "dubois", "jensen", "kowalski", "santos", "nguyen", "patel", "brown",
    "lopez", "schmidt", "costa", "ivanova", "haddad", "yilmaz", "martin",
    "berg", "lind", "moreau", "fischer", "weber", "romano", "ferreira",
    "sato", "park", "singh", "khan", "ali", "cohen", "levi", "olsen",
    "hansen", "meyer", "wagner",
]
DOMAINS = ["example.com", "example.net", "example.org"]

# Weights per thousand rows.
COUNTRIES = [
    ("US", 280), ("IN", 110), ("BR", 80), ("DE", 70), ("GB", 60),
    ("FR", 55), ("JP", 50), ("CA", 45), ("MX", 40), ("ES", 35),
    ("IT", 35), ("PL", 30), ("NL", 25), ("SE", 20), ("KR", 20),
    ("AU", 15), ("TR", 15), ("NO", 10), ("PT", 4), ("IS", 1),
]
STATUSES = [("active", 20), ("inactive", 930), ("suspended", 50)]

START = calendar.timegm((2023, 1, 1, 0, 0, 0))
NEW_USERS_START = calendar.timegm((2026, 1, 1, 0, 0, 0))
MEAN_GAP = 94.6

SCHEMA = """CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL
)"""


def make_email(rng):
    first = rng.choice(FIRST)
    last = rng.choice(LAST)
    style = rng.random()
    if rng.random() < 0.10:
        local = first.capitalize() + "." + last.capitalize()
    elif style < 0.45:
        local = first + "." + last
    elif style < 0.65:
        local = first + "_" + last
    elif style < 0.80:
        local = first + last
    else:
        local = first[0] + last
    if rng.random() < 0.75:
        local += str(rng.randint(1, 9999))
    return local + "@" + rng.choice(DOMAINS)


def user_rows(n=N_USERS, seed=SEED):
    """Yield (id, email, country, created_at, status), the same rows for the same seed."""
    rng = random.Random(seed)
    seen = set()
    countries = [c for c, _ in COUNTRIES]
    country_w = [w for _, w in COUNTRIES]
    statuses = [s for s, _ in STATUSES]
    status_w = [w for _, w in STATUSES]
    t = START
    for i in range(1, n + 1):
        email = make_email(rng)
        while email.lower() in seen:
            email = make_email(rng)
        seen.add(email.lower())
        t += max(1, round(rng.expovariate(1 / MEAN_GAP)))
        created = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(t))
        country = rng.choices(countries, country_w)[0]
        status = rng.choices(statuses, status_w)[0]
        yield (i, email, country, created, status)


def rows_digest(rows):
    h = hashlib.sha256()
    for r in rows:
        h.update(("\x1f".join(map(str, r)) + "\n").encode())
    return h.hexdigest()[:16]


def connect(path):
    return sqlite3.connect(path, autocommit=True)


def build_users(path, n=N_USERS, seed=SEED, indexes=()):
    """Create a fresh database file with the users table and the given CREATE INDEX statements."""
    for suffix in ("", "-journal", "-wal", "-shm"):
        if os.path.exists(path + suffix):
            os.remove(path + suffix)
    con = connect(path)
    con.execute(SCHEMA)
    for sql in indexes:
        con.execute(sql)
    con.execute("BEGIN")
    con.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?)", user_rows(n, seed))
    con.execute("COMMIT")
    con.close()


def copy_db(src, dst):
    """Remove dst and its journal, WAL and shm files, copy src to dst, and fsync the copy."""
    for suffix in ("", "-journal", "-wal", "-shm"):
        if os.path.exists(dst + suffix):
            os.remove(dst + suffix)
    shutil.copyfile(src, dst)
    fd = os.open(dst, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)
    return dst


def remove_db(path):
    for suffix in ("", "-journal", "-wal", "-shm"):
        if os.path.exists(path + suffix):
            os.remove(path + suffix)


def resident_bytes(path):
    """Bytes of the file that are in the kernel page cache, as reported by fincore."""
    out = subprocess.run(
        ["fincore", "--bytes", "--noheadings", "--output", "RES", path],
        capture_output=True, text=True, check=True,
    ).stdout
    return int(out.split()[0])


def evict(path):
    """Write back and drop the cached pages of one file (posix_fadvise DONTNEED)."""
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(fd)
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
    finally:
        os.close(fd)


def cache_state(path):
    size = os.path.getsize(path)
    res = resident_bytes(path)
    return f"{res / size * 100:.0f}% of {size / 2**20:.1f} MiB in the page cache"


def load():
    with open("/proc/loadavg") as f:
        return "load average " + " ".join(f.read().split()[:3])


def header(title):
    print(f"# {title}")
    print(f"sqlite {sqlite3.sqlite_version}, python {platform.python_version()}, {load()}")


def run_times(fn, repeat):
    times = []
    for _ in range(repeat):
        t0 = time.perf_counter_ns()
        fn()
        times.append(time.perf_counter_ns() - t0)
    return times


def fmt_ns(ns):
    if ns >= 1e9:
        return f"{ns / 1e9:.2f} s"
    if ns >= 1e6:
        return f"{ns / 1e6:.2f} ms"
    return f"{ns / 1e3:.1f} us"


def spread(times):
    return (
        f"median {fmt_ns(statistics.median(times))} "
        f"(min {fmt_ns(min(times))}, max {fmt_ns(max(times))}, {len(times)} runs)"
    )


def io_counters():
    """rchar, wchar, read_bytes and write_bytes of this process, from /proc/self/io."""
    vals = {}
    with open("/proc/self/io") as f:
        for line in f:
            k, v = line.split(":")
            vals[k] = int(v)
    return vals
