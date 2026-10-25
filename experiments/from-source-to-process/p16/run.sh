#!/bin/sh
# Allocates a million small blocks, frees most of them, and shows what happens to the memory of the process.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra -pthread "$FIXTURE/p16/shrink.c" -o shrink
$RUSTC --edition 2024 -O "$FIXTURE/p16/shrink.rs" -o shrink_rs

{
    echo "\$ SHOW_STATS=1 ./shrink 1 1000"
    SHOW_STATS=1 ./shrink 1 1000 2>&1
    echo "\$ ./shrink 1 0   (free all the blocks)"
    ./shrink 1 0
} > "$RES/p16-single.txt"

{
    for keep in 1000 0; do
        echo "\$ strace -s 80 -e trace=brk,madvise,write ./shrink 1 $keep, system calls during each step"
        strace -s 80 -e trace=brk,madvise,write -o "trace_$keep.txt" ./shrink 1 "$keep" > /dev/null
        awk -f "$FIXTURE/p16/calls_per_step.awk" "trace_$keep.txt"
    done
    echo "\$ grep madvise trace_1000.txt | head -n 3"
    grep madvise trace_1000.txt | head -n 3
} > "$RES/p16-syscalls.txt"

{
    echo "\$ SHOW_STATS=1 ./shrink 8 1000"
    SHOW_STATS=1 ./shrink 8 1000 2>&1
    echo "\$ SHOW_STATS=1 MALLOC_ARENA_MAX=1 ./shrink 8 1000"
    SHOW_STATS=1 MALLOC_ARENA_MAX=1 ./shrink 8 1000 2>&1
} > "$RES/p16-threads.txt"

{
    echo "\$ ./shrink_rs"
    ./shrink_rs
} > "$RES/p16-rust.txt"
