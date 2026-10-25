#!/bin/sh
# Builds the programs of this directory and regenerates the files in results/
#   sh experiments/what-survives-a-crash/run.sh      runs every part
#   sh experiments/what-survives-a-crash/run.sh 7    runs part 7 only
#   sh experiments/what-survives-a-crash/run.sh p03_tools    runs one block of a part
#   RES=out/rerun sh experiments/what-survives-a-crash/run.sh    writes the results elsewhere
set -eu
cd "$(dirname "$0")"
OUT=out
RES="${RES:-results}"
mkdir -p "$OUT" "$RES"

build() {
  rustc +1.98.0 --edition 2024 -O "$1.rs" -o "$OUT/$1"
}

load() {
  echo "machine load: $(uptime | sed 's/.*load average/load average/')"
}

wait_for_line() {
  tries=0
  until grep -q "$2" "$1" 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -gt 3000 ]; then
      echo "timeout waiting for '$2' in $1" >&2
      exit 1
    fi
    sleep 0.01
  done
}

machine_facts() {
  echo "kernel: $(uname -r)"
  echo "filesystem of $OUT: $(df -T "$OUT" | awk 'NR==2 {print $2}')"
  echo "ext4 options: $(cat /proc/fs/ext4/nvme0n1p2/options | tr '\n' ' ')"
  echo "disk: $(cat /sys/block/nvme0n1/device/model | sed 's/ *$//')"
  echo "write cache: $(cat /sys/block/nvme0n1/queue/write_cache)"
  echo "logical block size: $(cat /sys/block/nvme0n1/queue/logical_block_size)"
  for knob in dirty_writeback_centisecs dirty_expire_centisecs dirty_background_ratio dirty_ratio; do
    echo "vm.$knob = $(cat /proc/sys/vm/$knob)"
  done
}

part1() {
  build dirty
  build chunks
  machine_facts > "$RES/p01-machine.txt"
  {
    echo "== 256 x 1 MiB write() then one fsync(), five runs"
    for run in 1 2 3 4 5; do
      echo "-- run $run, $(load)"
      "$OUT/dirty" fsync "$OUT/p01.bin"
      rm -f "$OUT/p01.bin"
    done
  } > "$RES/p01-dirty.txt"
  {
    echo "== 64 MiB in 1 MiB chunks, no fsync, then kill -9"
    rm -f "$OUT/p01-chunks.log"
    "$OUT/chunks" write "$OUT/p01-chunks.bin" 64 > "$OUT/p01-chunks.log" &
    pid=$!
    wait_for_line "$OUT/p01-chunks.log" waiting
    cat "$OUT/p01-chunks.log"
    kill -9 "$pid"
    status=0
    wait "$pid" || status=$?
    echo "exit status after kill -9: $status"
    "$OUT/chunks" check "$OUT/p01-chunks.bin" 64
    rm -f "$OUT/p01-chunks.bin"
  } > "$RES/p01-kill.txt"
  {
    echo "== the same 256 MiB and fsync under strace -T, $(load)"
    strace -T -e trace=write,fsync -o "$OUT/p01.strace" "$OUT/dirty" fsync "$OUT/p01.bin" > /dev/null
    rm -f "$OUT/p01.bin"
    grep '^write(3' "$OUT/p01.strace" | head -3
    echo "..."
    grep '^fsync' "$OUT/p01.strace"
    python3 tsum.py "$OUT/p01.strace" write,fsync
  } > "$RES/p01-strace.txt"
  {
    for mib in 256 256 256 4; do
      echo "== $mib MiB written without fsync, then one sample per second, $(load)"
      "$OUT/dirty" series "$OUT/p01-series.bin" 40 "$mib"
      rm -f "$OUT/p01-series.bin"
    done
  } > "$RES/p01-series.txt"
}

p02_synccost() {
  build synccost
  {
    echo "== 1000 rounds of 4 KiB with a sync after each, ext4 on NVMe, $(load)"
    for mode in append-fsync append-fdatasync overwrite-fdatasync dsync; do
      "$OUT/synccost" "$mode" "$OUT/p02.bin"
    done
    shm="/dev/shm/what-survives-a-crash-$$"
    mkdir -p "$shm"
    echo "== the same append-fsync loop on tmpfs ($(df -T /dev/shm | awk 'NR==2 {print $2}') at /dev/shm), $(load)"
    "$OUT/synccost" append-fsync "$shm/p02.bin"
    rm -rf "$shm"
  } > "$RES/p02-synccost.txt"
  {
    echo "$ head -2 /proc/fs/ext4/nvme0n1p2/fc_info"
    head -2 /proc/fs/ext4/nvme0n1p2/fc_info
    echo "$ uptime"
    uptime
    echo "$ df -T /tmp /dev/shm"
    df -T /tmp /dev/shm
  } > "$RES/p02-facts.txt"
}

p02_flush() {
  build synccost
  {
    echo "== 1000 fdatasync calls on a 4 KiB file that is already synced, ext4 on NVMe, $(load)"
    "$OUT/synccost" flush-only "$OUT/p02.bin"
  } > "$RES/p02-flush.txt"
}

part2() {
  p02_synccost
  p02_flush
}

TRACE="strace -f -s 24 -e trace=open,openat,creat,write,pwrite64,writev,fsync,fdatasync,sync_file_range,rename,renameat,renameat2,unlink,unlinkat,link,linkat,symlink,symlinkat,close,ftruncate,copy_file_range,fchown,fchmod"

p03_kill() {
  build save
  d="$OUT/p03"
  rm -rf "$d"
  mkdir -p "$d"
  {
    echo "== naive save: open with O_TRUNC, write 64 pieces of 4 KiB with 1 ms of work after each piece"
    python3 killer.py --runs 300 --max-ms 90 --seed 3 \
      --setup "$OUT/save safe $d/doc.txt 1 0" \
      --run "$OUT/save naive $d/doc.txt 2 1000" \
      --check "$OUT/save check $d/doc.txt"
    echo "== safe save: the same pieces into doc.txt.tmp, fsync, rename over doc.txt"
    python3 killer.py --runs 300 --max-ms 90 --seed 3 \
      --setup "rm -f $d/doc.txt.tmp; $OUT/save safe $d/doc.txt 1 0" \
      --run "$OUT/save safe $d/doc.txt 2 1000" \
      --check "echo \$($OUT/save check $d/doc.txt)\$(test -e $d/doc.txt.tmp && echo ', temp file left')"
    echo "== the same temp file and rename, without the fsync"
    python3 killer.py --runs 300 --max-ms 90 --seed 3 \
      --setup "rm -f $d/doc.txt.tmp; $OUT/save safe $d/doc.txt 1 0" \
      --run "$OUT/save rename $d/doc.txt 2 1000" \
      --check "echo \$($OUT/save check $d/doc.txt)\$(test -e $d/doc.txt.tmp && echo ', temp file left')"
  } > "$RES/p03-kill.txt"
  rm -rf "$d"
}

p03_tools() {
  t="$OUT/p03-tools"
  rm -rf "$t"
  mkdir -p "$t"
  printf 'name = new\n' > "$t/new.txt"
  {
    for tool in sed python cp install; do
      printf 'name = old\n' > "$t/config.txt"
      case "$tool" in
        sed) echo "== sed -i 's/old/new/' config.txt, $(sed --version | head -1)" ;;
        python) printf '%s\n' "== python3 -c 'open(\"config.txt\", \"w\").write(\"name = new\\n\")', $(python3 --version)" ;;
        cp) echo "== cp new.txt config.txt, $(cp --version | head -1)" ;;
        install) echo "== install -m 644 new.txt config.txt, $(install --version | head -1)" ;;
      esac
      (
        cd "$t"
        case "$tool" in
          sed) $TRACE -o trace sed -i 's/old/new/' config.txt ;;
          python) $TRACE -o trace python3 -c 'open("config.txt", "w").write("name = new\n")' ;;
          cp) $TRACE -o trace cp new.txt config.txt ;;
          install) $TRACE -o trace install -m 644 new.txt config.txt ;;
        esac
      )
      python3 opsview.py "$t/trace" "$t"
    done
    (
    export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
    git init -q -b main "$t/repo"
    git -C "$t/repo" config user.name example
    git -C "$t/repo" config user.email example@example.invalid
    printf 'hello\n' > "$t/repo/a.txt"
    echo "== git $(git --version | cut -d' ' -f3) add a.txt, default core.fsync"
    (cd "$t/repo" && $TRACE -o ../trace git add a.txt)
    python3 opsview.py "$t/trace" "$t/repo"
    echo "== git commit, default core.fsync"
    (cd "$t/repo" && $TRACE -o ../trace git commit -q -m first)
    python3 opsview.py "$t/trace" "$t/repo"
    printf 'again\n' >> "$t/repo/a.txt"
    git -C "$t/repo" add a.txt
    echo "== git -c core.fsync=all commit"
    (cd "$t/repo" && $TRACE -o ../trace git -c core.fsync=all commit -q -m second)
    python3 opsview.py "$t/trace" "$t/repo"
    )
  } > "$RES/p03-tools.txt"
  rm -rf "$t"
}

part3() {
  p03_kill
  p03_tools
}

part4() {
  build dirsync
  {
    for round in 1 2 3; do
      echo "== round $round: 200 new files of 4 KiB in a new directory, $(load)"
      for mode in file-only file-then-dir dir-only rename; do
        "$OUT/dirsync" "$mode" "$OUT/p04-dir"
      done
    done
  } > "$RES/p04-dirsync.txt"
  t="$OUT/p04-python"
  rm -rf "$t"
  mkdir -p "$t"
  {
    for variant in "" --no-flush; do
      printf 'name = old\n' > "$t/config.txt"
      echo "== python3 savedir.py config.txt $variant"
      (cd "$t" && $TRACE -o trace python3 ../../savedir.py config.txt $variant)
      python3 opsview.py "$t/trace" "$t"
    done
  } > "$RES/p04-python.txt"
  rm -rf "$t"
}

part5() {
  build zerolen
  {
    echo "auto_da_alloc in the mount options: $(tr ' ' '\n' < /proc/fs/ext4/nvme0n1p2/options | grep -c '^auto_da_alloc$')"
    for round in 1 2; do
      echo "== round $round, $(load)"
      for mode in rename-over rename-new truncate new-file; do
        "$OUT/zerolen" "$mode" "$OUT/p05"
      done
    done
  } > "$RES/p05-zerolen.txt"
}

p06_kill() {
  build bigwrite
  {
    for delay in 0.02 0.05 0.1 0.2; do
      rm -f "$OUT/p06.log" "$OUT/p06.bin"
      "$OUT/bigwrite" write "$OUT/p06.bin" > "$OUT/p06.log" &
      pid=$!
      wait_for_line "$OUT/p06.log" ready
      sleep "$delay"
      kill -9 "$pid"
      status=0
      wait "$pid" || status=$?
      echo "== kill -9 about $delay s after the write() call started, exit status $status"
      cat "$OUT/p06.log"
      "$OUT/bigwrite" check "$OUT/p06.bin"
    done
    echo "== the same write() without kill"
    "$OUT/bigwrite" write "$OUT/p06.bin"
    "$OUT/bigwrite" check "$OUT/p06.bin"
    rm -f "$OUT/p06.bin" "$OUT/p06.log"
  } > "$RES/p06-bigwrite.txt"
}

p06_reader() {
  build bigwrite
  {
    echo "== a second process prints the file size each time it changes, while one write() of 1 GiB runs"
    rm -f "$OUT/p06.bin"
    python3 watchsize.py "$OUT/p06.bin" 2.0 &
    watcher=$!
    sleep 0.2
    "$OUT/bigwrite" write "$OUT/p06.bin"
    wait "$watcher"
    rm -f "$OUT/p06.bin"
  } > "$RES/p06-reader.txt"
}

p06_append() {
  build bigwrite
  f="$OUT/p06-append.bin"
  {
    for pieces in 1 2; do
      echo "== 4 processes append to one file with O_APPEND at the same time, $pieces write() call(s) per record"
      for spec in "100 10000" "65536 1024" "1048576 64" "16777216 4"; do
        set -- $spec
        rm -f "$OUT/p06-go"
        : > "$f"
        for w in 0 1 2 3; do
          "$OUT/bigwrite" append "$f" "$w" "$1" "$2" "$pieces" "$OUT/p06-go" &
        done
        sleep 0.2
        : > "$OUT/p06-go"
        wait
        "$OUT/bigwrite" verify "$f" "$1" 4 "$2"
      done
    done
    rm -f "$f" "$OUT/p06-go"
  } > "$RES/p06-append.txt"
}

part6() {
  p06_kill
  p06_reader
  p06_append
}

part7() {
  build save
  rm -rf "$OUT/p07"
  mkdir -p "$OUT/p07"
  python3 simsave.py "$OUT/save" "$OUT/p07" > "$RES/p07-simsave.txt"
  rm -rf "$OUT/p07"
}

p08_fuzz() {
  build applog
  {
    "$OUT/applog" selftest
    python3 -c "import zlib; print('zlib.crc32 of \"123456789\" = %08x' % zlib.crc32(b'123456789'))"
    "$OUT/applog" fuzz
  } > "$RES/p08-fuzz.txt"
}

p08_kill() {
  build applog
  d="$OUT/p08"
  rm -rf "$d"
  mkdir -p "$d"
  {
    echo "== append records of 16 to 6015 bytes without fsync, one write() per record, kill -9 at a random moment"
    python3 killer.py --runs 300 --max-ms 60 --seed 8 \
      --setup "rm -f $d/log" \
      --run "$OUT/applog append $d/log 5000 nosync" \
      --check "$OUT/applog tail $d/log"
  } > "$RES/p08-kill.txt"
  rm -rf "$d"
}

p08_sim() {
  build applog
  d="$OUT/p08"
  rm -rf "$d"
  mkdir -p "$d"
  python3 simlog.py "$OUT/applog" "$d" > "$RES/p08-simlog.txt"
  rm -rf "$d"
}

part8() {
  p08_fuzz
  p08_kill
  p08_sim
}

part9() {
  build kv
  d="$OUT/p09"
  rm -rf "$d"
  mkdir -p "$d/data"
  {
    for bug in "" "--bug ack-before-fsync"; do
      rm -rf "$d/data"
      mkdir -p "$d/data"
      printf '%s\n' "== printf 'put a 1\\nput b 2\\n' | kv . $bug"
      (cd "$d/data" && printf 'put a 1\nput b 2\n' | $TRACE -o ../trace ../../kv . $bug > /dev/null)
      python3 opsview.py "$d/trace" "$d/data" --stdout
    done
  } > "$RES/p09-order.txt"
  {
    rm -rf "$d/data"
    mkdir -p "$d/data"
    printf '%s\n' "== printf 'put a 1\\nput b 2\\nadd c 5\\ndel a\\nput d 4\\nadd c 3\\n' | kv data"
    printf 'put a 1\nput b 2\nadd c 5\ndel a\nput d 4\nadd c 3\n' | "$OUT/kv" "$d/data"
    echo "== kv data dump, a new process that recovers from the files"
    "$OUT/kv" "$d/data" dump
  } > "$RES/p09-example.txt"
  {
    echo "== $(load)"
    for mode in fsync nosync; do
      rm -rf "$d/data"
      mkdir -p "$d/data"
      if [ "$mode" = fsync ]; then count=2000; else count=200000; fi
      "$OUT/kv" "$d/data" bench "$count" "$mode"
    done
  } > "$RES/p09-bench.txt"
  rm -rf "$d"
  mkdir -p "$d"
  python3 simkv.py "$OUT/kv" "$d" wal > "$RES/p09-simkv.txt"
  rm -rf "$d"
}

part10() {
  build kv
  d="$OUT/p10"
  rm -rf "$d"
  mkdir -p "$d"
  cmds='put a 1\nput b 2\nadd c 5\nbegin-checkpoint\nput d 4\nadd c 3\nend-checkpoint\nput e 5\n'
  {
    rm -rf "$d/data"
    mkdir -p "$d/data"
    echo "== the commands under strace, correct version"
    (cd "$d/data" && printf "$cmds" | $TRACE -o ../trace ../../kv . > /dev/null)
    python3 opsview.py "$d/trace" "$d/data" --stdout
  } > "$RES/p10-order.txt"
  {
    for bug in "" "--bug snapshot-not-durable" "--bug lose-tail"; do
      rm -rf "$d/data"
      mkdir -p "$d/data"
      echo "== kv $bug: the commands, then a clean restart, no crash"
      printf "$cmds" | "$OUT/kv" "$d/data" $bug > /dev/null
      "$OUT/kv" "$d/data" dump $bug
    done
  } > "$RES/p10-restart.txt"
  rm -rf "$d"
  mkdir -p "$d"
  python3 simkv.py "$OUT/kv" "$d" checkpoint > "$RES/p10-simkv.txt"
  rm -rf "$d"
}

p11_commands() {
  for i in 1 2 3 4 5 6 7 8 9 10; do echo "add c $i"; done > "$1"
  for i in 0 1 2 3 4; do echo "put k$i $i"; done >> "$1"
  printf 'del k1\nadd d 7\n' >> "$1"
}

p11_order() {
  build kv
  d="$OUT/p11"
  rm -rf "$d"
  mkdir -p "$d/data"
  p11_commands "$d/commands"
  "$OUT/kv" "$d/data" < "$d/commands" > /dev/null
  {
    echo "== the files before recovery: $(cd "$d/data" && ls | tr '\n' ' ')"
    echo "== kv . dump under strace: the recovery and its checkpoint"
    (cd "$d/data" && $TRACE -o ../trace ../../kv . dump > /dev/null)
    python3 opsview.py "$d/trace" "$d/data"
    echo "== the files after recovery: $(cd "$d/data" && ls | tr '\n' ' ')"
  } > "$RES/p11-order.txt"
  rm -rf "$d"
}

p11_kill() {
  build kv
  d="$OUT/p11"
  rm -rf "$d"
  mkdir -p "$d"
  p11_commands "$d/commands"
  {
    for bug in "" "--bug double-apply"; do
      rm -rf "$d/prepared" "$d/reference"
      mkdir -p "$d/prepared"
      "$OUT/kv" "$d/prepared" $bug < "$d/commands" > /dev/null
      cp -r "$d/prepared" "$d/reference"
      "$OUT/kv" "$d/reference" dump $bug > "$d/reference.txt"
      echo "== kv dump $bug: recovery of a log with 17 operations, kill -9 during recovery, then a second recovery"
      python3 killer.py --runs 500 --max-ms 5 --seed 11 \
        --setup "rm -rf $d/data && cp -r $d/prepared $d/data" \
        --run "$OUT/kv $d/data dump $bug" \
        --check "$OUT/kv $d/data dump $bug | python3 samemap.py $d/reference.txt"
    done
  } > "$RES/p11-kill.txt"
  rm -rf "$d"
}

p11_sim() {
  build kv
  d="$OUT/p11"
  rm -rf "$d"
  mkdir -p "$d"
  python3 simkv.py "$OUT/kv" "$d" recovery > "$RES/p11-simkv.txt"
  rm -rf "$d"
}

part11() {
  p11_order
  p11_kill
  p11_sim
}

shim() {
  gcc -O2 -Wall -Wextra -shared -fPIC -o "$OUT/faultshim.so" faultshim.c
}

part12() {
  build kv
  build retrysync
  shim
  d="$OUT/p12"
  rm -rf "$d"
  mkdir -p "$d"
  printf 'put a 1\nput b 2\nput c 3\nput d 4\n' > "$d/commands"
  {
    for fault in "fdatasync 3 EIO" "write 3 ENOSPC"; do
      set -- $fault
      rm -rf "$d/data"
      mkdir -p "$d/data"
      echo "== kv with the shim: FAULT_CALL=$1 FAULT_AT=$2 FAULT_ERRNO=$3, commands: put a 1, put b 2, put c 3, put d 4"
      status=0
      FAULT_CALL=$1 FAULT_AT=$2 FAULT_ERRNO=$3 LD_PRELOAD="$PWD/$OUT/faultshim.so" \
        "$OUT/kv" "$d/data" < "$d/commands" 2>&1 || status=$?
      echo "exit status: $status"
      echo "== recovery at the next start, without the shim"
      "$OUT/kv" "$d/data" dump
    done
    echo "== retrysync with the shim: FAULT_CALL=fdatasync FAULT_AT=1 FAULT_ERRNO=EIO"
    FAULT_CALL=fdatasync FAULT_AT=1 FAULT_ERRNO=EIO LD_PRELOAD="$PWD/$OUT/faultshim.so" "$OUT/retrysync" "$d/record.txt"
    echo "content of the file afterwards: $(cat "$d/record.txt")"
  } > "$RES/p12-faults.txt"
  rm -rf "$d"
}

sqlite_trace() {
  mode="$1"
  sync="$2"
  rm -rf "$d/db"
  mkdir -p "$d/db"
  sqlite3 "$d/db/test.db" "PRAGMA journal_mode=$mode; CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT);" > /dev/null
  printf "PRAGMA synchronous=%s;\nINSERT INTO t(v) VALUES('hello');\n" "$sync" > "$d/insert.sql"
  (cd "$d/db" && $TRACE -o ../trace sqlite3 test.db < ../insert.sql)
  python3 opsview.py "$d/trace" "$d/db"
}

part13() {
  d="$OUT/p13"
  rm -rf "$d"
  mkdir -p "$d"
  {
    echo "== $(sqlite3 --version | cut -d' ' -f1-2), defaults for a new database file:"
    sqlite3 "$d/x.db" "SELECT 'journal_mode=' || (SELECT * FROM pragma_journal_mode) || ' synchronous=' || (SELECT * FROM pragma_synchronous) || ' page_size=' || (SELECT * FROM pragma_page_size);"
    rm -f "$d/x.db"
    for sync in FULL EXTRA NORMAL OFF; do
      echo "== one INSERT in its own transaction, journal_mode=delete, synchronous=$sync"
      sqlite_trace delete "$sync"
    done
  } > "$RES/p13-trace.txt"
  {
    echo "== $(load)"
    for sync in FULL EXTRA NORMAL; do
      python3 sqlbench.py "$d" delete "$sync" 500
    done
    python3 sqlbench.py "$d" delete OFF 5000
  } > "$RES/p13-bench.txt"
  rm -rf "$d"
}

part14() {
  d="$OUT/p14"
  rm -rf "$d"
  mkdir -p "$d"
  {
    for sync in FULL NORMAL; do
      rm -rf "$d/db"
      mkdir -p "$d/db"
      sqlite3 "$d/db/test.db" "PRAGMA journal_mode=WAL; CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT);" > /dev/null
      {
        echo "PRAGMA synchronous=$sync;"
        for n in 1 2 3; do
          echo ".print -- insert $n"
          echo "INSERT INTO t(v) VALUES('row $n');"
        done
        echo ".print -- checkpoint"
        echo "PRAGMA wal_checkpoint;"
        echo ".print -- exit"
      } > "$d/script.sql"
      echo "== journal_mode=wal, synchronous=$sync: one process, three INSERTs, a checkpoint, exit"
      (cd "$d/db" && $TRACE -o ../trace sqlite3 test.db < ../script.sql > /dev/null)
      python3 opsview.py "$d/trace" "$d/db" --stdout
    done
  } > "$RES/p14-trace.txt"
  {
    echo "== $(load)"
    python3 sqlbench.py "$d" wal FULL 500
    python3 sqlbench.py "$d" wal NORMAL 5000
    python3 sqlbench.py "$d" delete FULL 500
  } > "$RES/p14-bench.txt"
  rm -rf "$d"
}

part15() {
  d="$OUT/p15"
  rm -rf "$d"
  mkdir -p "$d"
  {
    echo "PRAGMA synchronous=OFF;"
    i=0
    while [ "$i" -lt 20000 ]; do
      echo "INSERT INTO t(v) VALUES('row'); SELECT 'ok', max(id) FROM t;"
      i=$((i + 1))
    done
  } > "$d/insert.sql"
  {
    for mode in delete wal; do
      rm -f "$d/base.db"
      sqlite3 "$d/base.db" "PRAGMA journal_mode=$mode; CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT);" > /dev/null
      echo "== sqlite3, journal_mode=$mode, synchronous=OFF: 20000 single-row transactions, each one printed ok|N after its commit"
      python3 killer.py --runs 200 --max-ms 300 --seed 15 \
        --setup "rm -f $d/test.db $d/test.db-journal $d/test.db-wal $d/test.db-shm $d/acks.txt && cp $d/base.db $d/test.db" \
        --run "sh -c 'exec sqlite3 $d/test.db < $d/insert.sql > $d/acks.txt'" \
        --check "python3 sqlcheck.py $d/test.db $d/acks.txt"
    done
  } > "$RES/p15-kill.txt"
  rm -rf "$d"
}

part16() {
  build groupcommit
  {
    echo "== records of 100 bytes, each one durable before its writer continues, 1 second per line, $(load)"
    for strategy in alone group group+delay; do
      "$OUT/groupcommit" "$strategy" "$OUT/p16.log"
    done
  } > "$RES/p16-groupcommit.txt"
}

part17() {
  build mmapwrite
  f="$OUT/p17.bin"
  {
    echo "== $(load), read_ahead_kb of nvme0n1: $(cat /sys/block/nvme0n1/queue/read_ahead_kb)"
    for how in none msync fsync; do
      "$OUT/mmapwrite" sync "$f" 64 "$how"
    done
  } > "$RES/p17-sync.txt"
  {
    echo "== strace -f -e trace=write,pwrite64,writev,msync,fsync,fdatasync,mmap: mmapwrite sync, 16 MiB, msync"
    strace -f -e trace=write,pwrite64,writev,msync,fsync,fdatasync,mmap -o "$OUT/p17.trace" "$OUT/mmapwrite" sync "$f" 16 msync > /dev/null
    grep -E '^[0-9]+ +(mmap\(NULL, 16777216|msync)' "$OUT/p17.trace" | sed 's/^[0-9]* *//'
    echo "write, pwrite64 and writev calls on the file (descriptor 3): $(grep -cE '^[0-9]+ +(write|pwrite64|writev)\(3,' "$OUT/p17.trace" || true)"
    echo "write calls on standard output (descriptor 1): $(grep -cE '^[0-9]+ +write\(1,' "$OUT/p17.trace" || true)"
  } > "$RES/p17-strace.txt"
  {
    echo "== 64 MiB written through a MAP_SHARED mapping, no msync and no fsync, then kill -9"
    rm -f "$OUT/p17.log"
    "$OUT/mmapwrite" kill "$f" 64 > "$OUT/p17.log" &
    pid=$!
    wait_for_line "$OUT/p17.log" waiting
    cat "$OUT/p17.log"
    kill -9 "$pid"
    status=0
    wait "$pid" || status=$?
    echo "exit status after kill -9: $status"
    "$OUT/mmapwrite" check "$f"
  } > "$RES/p17-kill.txt"
  {
    echo "== map 8 KiB of a file, truncate the file to 4 KiB, write to the second page"
    status=0
    (ulimit -c 0 && exec "$OUT/mmapwrite" sigbus "$f") || status=$?
    echo "exit status: $status, which is 128 + $((status - 128)), and signal $((status - 128)) is SIG$(kill -l "$((status - 128))")"
  } > "$RES/p17-sigbus.txt"
  if [ -f /usr/include/lmdb.h ]; then
    {
      echo "== /usr/include/lmdb.h, LMDB $(awk '/define MDB_VERSION_(MAJOR|MINOR|PATCH)/ {printf "%s%s", sep, $3; sep="."}' /usr/include/lmdb.h)"
      grep -n -B1 -A3 'read-only by default' /usr/include/lmdb.h
      grep -n -A2 'Use a writeable memory map unless MDB_RDONLY is set' /usr/include/lmdb.h
    } > "$RES/p17-lmdb.txt"
  fi
  rm -f "$f" "$OUT/p17.log" "$OUT/p17.trace"
}

part18() {
  build applog
  d="$OUT/p18"
  rm -rf "$d"
  mkdir -p "$d"
  python3 bitflip.py "$OUT/applog" "$d" > "$RES/p18-bitflip.txt"
  rm -rf "$d"
}

part19() {
  build twofiles
  d="$OUT/p19"
  rm -rf "$d"
  mkdir -p "$d"
  {
    for layout in separate symlink exchange; do
      echo "== twofiles $layout: version 1 to version 2, kill -9 at a random moment"
      python3 killer.py --runs 300 --max-ms 6 --seed 19 \
        --setup "$OUT/twofiles setup $d/data $layout" \
        --run "$OUT/twofiles $layout $d/data" \
        --check "$OUT/twofiles check $d/data $layout"
    done
  } > "$RES/p19-kill.txt"
  rm -rf "$d"
  mkdir -p "$d"
  python3 simtwo.py "$OUT/twofiles" "$d" > "$RES/p19-simtwo.txt"
  {
    echo "== the layouts after a complete update"
    for layout in separate symlink exchange; do
      "$OUT/twofiles" setup "$d/data" "$layout"
      "$OUT/twofiles" "$layout" "$d/data" > /dev/null
      echo "-- $layout: $(cd "$d/data" && find . -mindepth 1 | sort | tr '\n' ' ')"
      if [ -L "$d/data/current" ]; then echo "   current -> $(readlink "$d/data/current")"; fi
      if [ -d "$d/data/staging" ]; then echo "   staging/config: $(cat "$d/data/staging/config")"; fi
    done
  } > "$RES/p19-layouts.txt"
  rm -rf "$d"
}

part20() {
  build kv
  shim
  d="$OUT/p20"
  rm -rf "$d"
  mkdir -p "$d"
  python3 crashtest.py "$OUT/kv" "$d" "$OUT/faultshim.so" 200 > "$RES/p20-crashtest.txt"
  rm -rf "$d"
}

mkdir -p "$RES"
if [ "$#" -gt 0 ]; then
  case "$1" in
    [0-9]*) "part$1" ;;
    *) "$1" ;;
  esac
else
  for n in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    "part$n"
  done
fi
