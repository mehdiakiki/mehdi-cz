#!/bin/sh
# Measures the first and the second touch of 1 GiB of memory in C and Rust, with and without huge pages.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra "$FIXTURE/p13/touch.c" -o touch
sed -e 's/fill(p, 0, SIZE)/memset(p, 0, SIZE)/' -e '/(\*volatile fill)/d' "$FIXTURE/p13/touch.c" > touch_direct.c
gcc -O2 -Wall -Wextra touch_direct.c -o touch_direct
gcc -O2 -fPIC -shared "$FIXTURE/p09/count.c" -o libcount.so
$RUSTC --edition 2024 -O "$FIXTURE/p13/vec_touch.rs" -o vec_touch

{
    echo "\$ uptime"
    uptime
    echo "\$ cat /sys/kernel/mm/transparent_hugepage/enabled /sys/kernel/mm/transparent_hugepage/defrag"
    cat /sys/kernel/mm/transparent_hugepage/enabled /sys/kernel/mm/transparent_hugepage/defrag
    echo "\$ grep -E 'MemFree|MemAvailable|SwapFree' /proc/meminfo"
    grep -E 'MemFree|MemAvailable|SwapFree' /proc/meminfo
    echo "\$ cat /proc/buddyinfo   (free blocks of 2^0 .. 2^10 pages)"
    cat /proc/buddyinfo
} > "$RES/p13-memory-state.txt"

{
    for m in default nohugepage hugepage populate malloc-memset calloc; do
        echo "\$ taskset -c 2 ./touch $m"
        taskset -c 2 ./touch "$m"
    done
    echo "\$ uptime"
    uptime
} > "$RES/p13-c.txt"

{
    echo "\$ the same program with memset(p, 0, SIZE) called directly (touch_direct.c)"
    grep -n 'memset' touch_direct.c
    echo "\$ nm -D touch_direct | grep -c memset"
    nm -D touch_direct | grep -c memset || true
    echo "\$ nm -D touch | grep memset   (the version that calls memset through a volatile pointer)"
    nm -D touch | grep memset
    echo "\$ taskset -c 2 ./touch_direct malloc-memset"
    taskset -c 2 ./touch_direct malloc-memset
} > "$RES/p13-dead-memset.txt"

{
    echo "\$ python3 gotcalls.py vec_touch vec_touch::main"
    python3 -I "$FIXTURE/p13/gotcalls.py" vec_touch 'vec_touch::main'
    for m in vec-macro resize-zero resize-one; do
        echo "\$ taskset -c 2 ./vec_touch $m"
        taskset -c 2 ./vec_touch "$m"
    done
    for m in vec-macro resize-zero resize-one; do
        echo "\$ LD_PRELOAD=./libcount.so ./vec_touch $m | grep libcount"
        LD_PRELOAD=./libcount.so ./vec_touch "$m" 2>&1 | grep libcount
    done
    echo "\$ uptime"
    uptime
} > "$RES/p13-rust.txt"
