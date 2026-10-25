#!/bin/sh
# Builds the hello programs, traces their system calls and times how long one start takes.
set -eu
gcc -O2 hello.c -o "$B/hello_c_dyn"
gcc -O2 -static hello.c -o "$B/hello_c_static"
$RUSTC -O hello.rs -o "$B/hello_rs"
$RUSTC --edition 2024 -O hello_nomain.rs -o "$B/hello_rs_nomain"
gcc -O2 -Wall -Wextra spawn.c -o "$B/spawn"

{
    echo "\$ wc -c (file size in bytes)"
    for b in hello_c_dyn hello_c_static hello_rs hello_rs_nomain; do
        printf '%-16s %9d\n' "$b" "$(wc -c < "$B/$b")"
    done
    for b in hello_c_dyn hello_c_static hello_rs; do
        echo "\$ readelf -lW $b | grep -E 'Entry point|interpreter'"
        readelf -lW "$B/$b" | grep -E 'Entry point|interpreter' || true
    done
    echo "\$ readelf -h /usr/lib/ld-linux-x86-64.so.2 | grep Entry"
    readelf -h /usr/lib/ld-linux-x86-64.so.2 | grep Entry
} > "$RES/p01-binaries.txt"

{
    echo "\$ readelf -h /usr/lib/libc.so.6 | grep 'program headers'"
    readelf -h /usr/lib/libc.so.6 | grep 'program headers'
    echo "\$ readelf -lW /usr/lib/libc.so.6 | grep LOAD"
    readelf -lW /usr/lib/libc.so.6 | grep LOAD
    echo "\$ nm /usr/lib/ld-linux-x86-64.so.2"
    nm /usr/lib/ld-linux-x86-64.so.2 2>&1 || true
    echo "\$ readelf -d hello_rs | grep NEEDED"
    readelf -d "$B/hello_rs" | grep NEEDED
    echo "\$ nm -D hello_rs | grep _Unwind"
    nm -D "$B/hello_rs" | grep _Unwind
} > "$RES/p01-libraries.txt"

for b in hello_c_dyn hello_c_static hello_rs hello_rs_nomain; do
    (cd "$B" && strace -o "strace_$b.txt" "./$b" > "stdout_$b.txt")
    sed 's|"/home/[^"]*"|"DIR"|' "$B/strace_$b.txt" > "$RES/p01-strace-$b.txt"
    (cd "$B" && strace -k -o "stack_$b.txt" "./$b" > "stdout_$b.txt")
    {
        echo "\$ strace -k ./$b: the first frame after execve"
        sed -n 2p "$B/stack_$b.txt" | sed "s|$B/||"
        echo
        python3 -I who.py table "$B/stack_$b.txt" "$B/$b" 'write(1, "hello'
    } > "$RES/p01-who-$b.txt"
done

{
    for b in hello_c_dyn hello_rs; do
        echo "\$ strace -k ./$b > file: the stack of the write, innermost frame first"
        python3 -I who.py stack "$B/stack_$b.txt" "$B/$b" 'write(1, "hello'
    done
} > "$RES/p01-write-stack.txt"

{
    echo "\$ uptime"
    uptime
    echo "each program alone, pinned to CPU 2:"
    for b in hello_c_dyn hello_c_static hello_rs hello_rs_nomain; do
        echo "\$ taskset -c 2 ./spawn 1000 ./$b"
        (cd "$B" && taskset -c 2 ./spawn 1000 "./$b")
    done
    echo "the four programs in turn, pinned to CPU 2:"
    echo "\$ taskset -c 2 ./spawn 1000 ./hello_c_dyn ./hello_c_static ./hello_rs ./hello_rs_nomain"
    (cd "$B" && taskset -c 2 ./spawn 1000 ./hello_c_dyn ./hello_c_static ./hello_rs ./hello_rs_nomain)
    echo "the four programs in turn, not pinned:"
    echo "\$ ./spawn 1000 ./hello_c_dyn ./hello_c_static ./hello_rs ./hello_rs_nomain"
    (cd "$B" && ./spawn 1000 ./hello_c_dyn ./hello_c_static ./hello_rs ./hello_rs_nomain)
    echo "\$ uptime"
    uptime
} > "$RES/p01-startup-time.txt"

{
    echo "the 'each program alone' runs of p01-startup-time.txt, in one table:"
    awk '/^each program alone/ { on = 1; next } /^the four programs in turn/ { on = 0 }
         on && /^program/ && !header { print; header = 1 } on && /^hello/ { print }' "$RES/p01-startup-time.txt"
} > "$RES/p01-startup-alone.txt"

(cd "$B" && gdb -q -batch -ex 'set debuginfod enabled off' \
    -ex 'echo $ gdb ./hello_c_dyn, starti, then cat /proc/PID/maps\n' -ex 'starti > /dev/null' \
    -ex 'python print(open("/proc/%d/maps" % gdb.selected_inferior().pid).read())' \
    -ex 'break main' -ex 'echo $ continue to main, then cat /proc/PID/maps again\n' -ex 'continue' \
    -ex 'python print(open("/proc/%d/maps" % gdb.selected_inferior().pid).read())' \
    ./hello_c_dyn 2>&1) | grep -vE 'This GDB supports|debuginfod|Debuginfod|answered N|permanent|libthread_db' \
    | sed "s|$B/||" > "$RES/p01-maps-at-start.txt"
