#!/bin/sh
# Prints the memory map of a C and a Rust program, with and without address randomization.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra "$FIXTURE/p12/maps.c" -o maps
gcc -O2 -Wall -Wextra -no-pie "$FIXTURE/p12/maps.c" -o maps_nopie
$RUSTC --edition 2024 -O "$FIXTURE/p12/maps.rs" -o maps_rs
arch=$(uname -m)
short() { sed "s|$B/||"; }

{
    echo "\$ strace -e trace=mmap,munmap,brk -o strace_maps.txt ./maps"
    strace -e trace=mmap,munmap,brk -o strace_maps.txt ./maps | short
    echo "\$ cat strace_maps.txt"
    cat strace_maps.txt
} > "$RES/p12-c-maps.txt"

{
    for i in 1 2; do
        echo "\$ ./maps | grep -E 'main|r--p 00000000 .* maps\$|heap'   (run $i)"
        ./maps | short | grep -E '^main|r--p 00000000 .* maps$|heap'
    done
    for i in 1 2; do
        echo "\$ setarch $arch -R ./maps | grep -E 'main|r--p 00000000 .* maps\$|heap'   (run $i)"
        setarch "$arch" -R ./maps | short | grep -E '^main|r--p 00000000 .* maps$|heap'
    done
    echo "\$ ./maps_nopie | head -n 7"
    ./maps_nopie | short | head -n 7
} > "$RES/p12-aslr.txt"

{
    echo "\$ ./maps smaps   (the smaps entry of the mapping that contains puts)"
    ./maps smaps
} > "$RES/p12-smaps.txt"

{
    echo "\$ ./maps_rs"
    ./maps_rs | short
} > "$RES/p12-rust-maps.txt"

{
    echo "\$ ls -i maps"
    ls -i maps
    echo "\$ stat -c '%D (device number of the file system, in hex)' maps"
    stat -c '%D (device number of the file system, in hex)' maps
    echo "\$ grep nvme /proc/partitions"
    grep nvme /proc/partitions
} > "$RES/p12-device.txt"
