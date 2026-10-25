#!/bin/sh
# Shows what runs before and after main: constructors, init_array, destructors, atexit, and a program without libc.
set -eu
cd "$B"
gcc -O2 -fPIC -shared "$FIXTURE/p10/libinit.c" -o libinit.so
gcc -O2 "$FIXTURE/p10/ctors.c" -o ctors
gcc -O2 -static "$FIXTURE/p10/ctors.c" -o ctors_static
gcc -O2 "$FIXTURE/p10/ctors.c" -L. -Wl,--no-as-needed -linit -Wl,-rpath,'$ORIGIN' -o ctors_lib
gcc -O2 -DSTATUS=42 -nostartfiles -nostdlib -static "$FIXTURE/p10/tiny.c" -o tiny
gcc -O2 -DSTATUS=42 -nostartfiles -nostdlib -static -Wl,-z,noseparate-code -s "$FIXTURE/p10/tiny.c" -o tiny_small
gcc -O2 -DSTATUS=0 -nostartfiles -nostdlib -static "$FIXTURE/p10/tiny.c" -o tiny_zero
gcc -O2 -static "$FIXTURE/p01/hello.c" -o hello_c_static
gcc -O2 "$FIXTURE/p01/spawn.c" -o spawn
$RUSTC -O "$FIXTURE/p01/hello.rs" -o hello_rs
quiet='This GDB supports|debuginfod|Debuginfod|answered N|permanent|libthread_db'
dbg() {
    gdb -q -batch -ex 'set debuginfod enabled off' "$@" 2>&1 | grep -vE "$quiet" | sed "s|$B/||"
}

{
    echo "\$ ./ctors"
    ./ctors
    echo "\$ ./ctors_lib (the same program, linked with libinit.so)"
    ./ctors_lib
    echo "\$ readelf -d ctors_lib | grep NEEDED"
    readelf -d ctors_lib | grep NEEDED
} > "$RES/p10-order.txt"

{
    echo "\$ readelf -x .init_array ctors"
    readelf -x .init_array ctors
    echo "\$ nm ctors (the functions in the two arrays)"
    nm ctors | grep -E ' (first|second|plain|frame_dummy|last|plain_end|__do_global_dtors_aux)$'
    echo "\$ readelf -x .fini_array ctors"
    readelf -x .fini_array ctors
} > "$RES/p10-arrays.txt"

{
    for b in ctors_static ctors; do
        echo "\$ gdb ./$b: break in the constructor 'plain', then backtrace"
        dbg -ex 'break plain' -ex 'run > /dev/null' -ex 'bt' "./$b"
        echo "\$ gdb ./$b: set backtrace past-main on, break main, backtrace"
        dbg -ex 'set backtrace past-main on' -ex 'break main' -ex 'run > /dev/null' -ex 'bt' "./$b"
    done
    echo "\$ gdb ./ctors_lib: break in the library constructor, backtrace"
    dbg -ex 'set breakpoint pending on' -ex 'break library_start' -ex 'run > /dev/null' -ex 'bt 4' ./ctors_lib
    echo "\$ readelf -h /usr/lib/ld-linux-x86-64.so.2 | grep Entry"
    readelf -h /usr/lib/ld-linux-x86-64.so.2 | grep Entry
} > "$RES/p10-backtraces.txt"

{
    echo "\$ ./tiny; echo \$?"
    ./tiny || echo "$?"
    echo "\$ objdump -d tiny"
    objdump -d tiny | sed -n '/<_start>:/,$p'
    echo "\$ readelf -lW tiny | grep LOAD"
    readelf -lW tiny | grep LOAD
    echo "\$ strace ./tiny"
    strace ./tiny 2>&1 || true
    echo "\$ wc -c tiny tiny_small"
    wc -c tiny tiny_small
    echo "\$ ./tiny_small; echo \$?"
    ./tiny_small || echo "$?"
} > "$RES/p10-tiny.txt"

{
    echo "\$ uptime"
    uptime
    for b in tiny_zero hello_c_static tiny_zero hello_c_static; do
        echo "\$ taskset -c 2 ./spawn 1000 ./$b"
        taskset -c 2 ./spawn 1000 "./$b"
    done
    echo "\$ uptime"
    uptime
} > "$RES/p10-tiny-time.txt"

{
    echo "\$ gdb ./hello_rs: set backtrace past-main on, break hello::main, backtrace"
    dbg -ex 'set backtrace past-main on' -ex 'break hello::main' -ex 'run > /dev/null' -ex 'bt' ./hello_rs
    echo "\$ readelf -SW hello_rs | grep -E 'init_array|fini_array'"
    readelf -SW hello_rs | grep -E 'init_array|fini_array'
    echo "\$ readelf -x .init_array hello_rs"
    readelf -x .init_array hello_rs
    echo "\$ readelf -rW hello_rs (the two relocations into .init_array)"
    start=$(readelf -SW hello_rs | awk '$2 == ".init_array" { print $4 }')
    readelf -rW hello_rs | awk -v s="$start" 'BEGIN { a = strtonum("0x" s) } $3 == "R_X86_64_RELATIVE" { o = strtonum("0x" $1); if (o >= a && o < a + 16) print }'
    echo "\$ nm -C hello_rs | grep -E 'ARGV_INIT_ARRAY|frame_dummy'"
    nm -C hello_rs | grep -E 'ARGV_INIT_ARRAY|frame_dummy'
    echo "\$ gdb ./hello_rs: break in std's init_wrapper, backtrace, argc and argv[0]"
    dbg -ex 'break std::sys::args::unix::imp::ARGV_INIT_ARRAY::init_wrapper' -ex 'run > /dev/null' -ex 'bt' \
        -ex 'set language c' -ex 'info registers rdi' -ex 'x/s *(char **)$rsi' ./hello_rs
} > "$RES/p10-rust.txt"
