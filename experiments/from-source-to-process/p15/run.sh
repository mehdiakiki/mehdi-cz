#!/bin/sh
# Traces which system calls malloc uses for small and large blocks, in C, and for a growing Rust Vec.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra "$FIXTURE/p15/sizes.c" -o sizes
$RUSTC --edition 2024 -O "$FIXTURE/p15/grow.rs" -o grow
calls=brk,mmap,munmap,mremap,write

{
    echo "\$ strace -s 80 -e trace=$calls ./sizes   (from the first malloc on)"
    strace -s 80 -e trace=$calls -o trace_sizes.txt ./sizes > /dev/null
    awk '/^write\(1, "malloc\(16 B\)/ { p = 1 } p' trace_sizes.txt
} > "$RES/p15-sizes.txt"

{
    for k in 127 129; do
        echo "\$ strace -s 80 -e trace=$calls ./sizes $k   (from the malloc on)"
        strace -s 80 -e trace=$calls -o "trace_$k.txt" ./sizes "$k" > /dev/null
        awk '/^write\(1, "malloc/ { p = 1 } p' "trace_$k.txt"
    done
} > "$RES/p15-first-allocation.txt"

{
    echo "\$ strace -s 80 -e trace=$calls ./grow   (from capacity 131072 on)"
    strace -s 80 -e trace=$calls -o trace_grow.txt ./grow > /dev/null
    awk '/^write\(1, "capacity +131072/ { p = 1 } p' trace_grow.txt
} > "$RES/p15-rust-grow.txt"
