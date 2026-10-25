#!/bin/sh
# Runs the experiments of this fixture.
#   sh run.sh        runs every part
#   sh run.sh 7      runs part 7 only
# Results go to out/results/ unless RESULTS is set (RESULTS=results rewrites
# the saved files in results/).
set -eu
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
export SQLITE_TMPDIR="$PWD/out"
OUT=out
RESULTS=${RESULTS:-$OUT/results}
mkdir -p "$OUT" "$RESULTS"

versions() {
    echo "sqlite3 CLI $(sqlite3 --version | cut -d' ' -f1-2)"
    python3 -c 'import platform, sqlite3; print("python", platform.python_version(), "sqlite3 module", sqlite3.sqlite_version)'
    echo "uptime:$(uptime)"
}

# Defaults of this SQLite build, for a new database file, in the shell and in Python.
machine() {
    db=$OUT/machine.db
    rm -f "$db"
    echo "# SQLite defaults of this build"
    echo "sqlite3 CLI $(sqlite3 --version | cut -d' ' -f1-2)"
    sqlite3 "$db" < p00_machine.sql 2>&1
    python3 -c 'import sqlite3; c = sqlite3.connect(":memory:"); print("python sqlite3 module", sqlite3.sqlite_version, "PRAGMA secure_delete:", c.execute("PRAGMA secure_delete").fetchone()[0])'
    rm -f "$db"
}

# Keeps the .stats lines about pages, sorts and virtual machine steps.
stats_filter() {
    grep -E -v 'ookaside|Outstanding|Largest|Pcache Overflow|Pager Heap|Schema Heap|Statement Heap|Reprepare|Number of times|Memory used by|Memory Used|Cancelled|Bytes |system calls|spill|Autoindex|Page cache writes' || true
}

part1() {
    db=$OUT/p01.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 1: an index is a second copy of your data"
        versions
        before=$(stat -c %s "$db")
        echo "file size before the index: $before bytes"
        sqlite3 "$db" < p01_sizes.sql
        after=$(stat -c %s "$db")
        echo "file size after the index: $after bytes"
        echo "the index added $((after - before)) bytes, $(((after - before) * 100 / before))% of the size before"
        echo "== the first index entry and its table row, read from the file"
        python3 p01_inside.py "$db"
        echo "== drop and rebuild, then one broken entry in a copy"
        python3 p01_rebuild.py "$db"
        echo "== the same rows in a WITHOUT ROWID table"
        sqlite3 "$db" < p01_without_rowid.sql
    } > "$RESULTS/p01-second-copy.txt" 2>&1
    rm -f "$db"
}

part2() {
    db=$OUT/p02.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 2: reading EXPLAIN QUERY PLAN"
        versions
        echo "== without an index"
        sqlite3 "$db" < p02_queries.sql 2>&1 | stats_filter
        python3 p02_time.py "$db" "without an index"
        sqlite3 "$db" < p02_sort.sql
        sqlite3 "$db" "CREATE INDEX users_email ON users(email); CREATE INDEX users_created ON users(created_at);"
        echo "== with an index on email and an index on created_at"
        sqlite3 "$db" < p02_queries.sql 2>&1 | stats_filter
        python3 p02_time.py "$db" "with the two indexes"
        echo "== bytecode"
        sqlite3 "$db" < p02_bytecode.sql
    } > "$RESULTS/p02-scan-versus-search.txt" 2>&1
    rm -f "$db"
    part2_steps
}

part2_steps() {
    db=$OUT/p02-steps.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 2: virtual machine steps, without .eqp"
        sqlite3 "$db" < p02_steps.sql
    } > "$RESULTS/p02-vm-steps.txt" 2>&1
    rm -f "$db"
}

part3() {
    trace_db=$OUT/p03-trace.db
    {
        python3 p03_bulk.py
        python3 p03_order.py
        python3 p03_order.py sources
        echo "== page cache spills in the sqlite3 shell, one run each"
        rm -f "$OUT/p03-spills.db"
        sqlite3 "$OUT/p03-spills.db" < p03_spills.sql 2>&1 | grep -E '^SELECT|^INSERT|Page cache|Run Time'
        rm -f "$OUT/p03-spills.db" "$OUT/p03-keys.db"
        python3 p03_commit.py
        echo "== system calls of 20 commits, no index (strace -c, calls and name)"
        cp "$OUT/users.db" "$trace_db"
        strace -f -c -e trace=fdatasync,fsync,pwrite64,unlink -o "$OUT/strace.txt" \
            python3 p03_commit.py trace "$trace_db" 20
        awk '$4 ~ /^[0-9]+$/ { print $4, $NF }' "$OUT/strace.txt"
        echo "== the syncs of one commit, with file names (strace -y)"
        strace -f -y -e trace=fdatasync,fsync,unlink,openat -o "$OUT/strace.txt" \
            python3 p03_commit.py trace "$trace_db" 1
        grep -E 'journal|sync' "$OUT/strace.txt" | sed -e "s|$(pwd)/||g" -e "s|$(pwd)|.|g" -e 's/^[0-9]* *//'
        rm -f "$trace_db" "$OUT/strace.txt"
    } > "$RESULTS/p03-insert-cost.txt" 2>&1
}

part4() {
    db=$OUT/p04.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 4: column order in a composite index"
        versions
        sqlite3 "$db" < p04_plans.sql 2>&1 | stats_filter
        python3 p04_time.py "$db"
    } > "$RESULTS/p04-column-order.txt" 2>&1
    rm -f "$db"
    part4_skipscan
}

part4_skipscan() {
    db=$OUT/p04-skipscan.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 4: the bytecode of the skip-scan"
        sqlite3 "$db" < p04_skipscan.sql
    } > "$RESULTS/p04-skip-scan.txt" 2>&1
    rm -f "$db"
}

part5() {
    db=$OUT/p05.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 5: a covering index"
        versions
        sqlite3 "$db" < p05_stats.sql 2>&1 | stats_filter
        python3 p05_time.py "$db"
    } > "$RESULTS/p05-covering-index.txt" 2>&1
    rm -f "$db"
}

part6() {
    db=$OUT/p06.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 6: when the database ignores your index"
        versions
        python3 p06_cases.py "$db"
    } > "$RESULTS/p06-ignored-index.txt" 2>&1
    rm -f "$db"
}

part7() {
    db=$OUT/p07.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 7: planner statistics go stale"
        versions
        python3 p07_stats.py "$db"
    } > "$RESULTS/p07-stale-statistics.txt" 2>&1
    rm -f "$db"
}

part8() {
    db=$OUT/p08.db
    cp "$OUT/users.db" "$db"
    {
        echo "# part 8: partial and expression indexes"
        versions
        python3 p08_partial.py "$db"
    } > "$RESULTS/p08-partial-expression.txt" 2>&1
    rm -f "$db"
}

part9() {
    {
        echo "# part 9: deleted rows, free pages and VACUUM"
        versions
        python3 p09_free.py
        echo "== the bytecode of PRAGMA incremental_vacuum(1000)"
        cp "$OUT/users.db" "$OUT/p09-inc.db"
        sqlite3 "$OUT/p09-inc.db" "PRAGMA auto_vacuum = INCREMENTAL; VACUUM;"
        sqlite3 "$OUT/p09-inc.db" "EXPLAIN PRAGMA incremental_vacuum(1000);"
        rm -f "$OUT/p09-inc.db"
    } > "$RESULTS/p09-free-pages.txt" 2>&1
}

part10() {
    {
        echo "# part 10: keeping a derived index in sync"
        versions
        python3 p10_sync.py
    } > "$RESULTS/p10-derived-search-index.txt" 2>&1
}

python3 make_users.py > "$RESULTS/p00-users.txt"
machine > "$RESULTS/p00-machine.txt"
if [ $# -eq 0 ]; then
    set -- 1 2 3 4 5 6 7 8 9 10
fi
for p in "$@"; do
    "part$p"
done
