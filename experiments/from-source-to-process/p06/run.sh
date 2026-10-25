#!/bin/sh
# Compares static and dynamic linking: the files, the start, the memory, and name lookups through NSS.
set -eu
ulimit -c 0
cd "$B"
gcc -O2 "$FIXTURE/p01/hello.c" -o hello_c_dyn
gcc -O2 -static "$FIXTURE/p01/hello.c" -o hello_c_static
gcc -O2 -static-pie "$FIXTURE/p01/hello.c" -o hello_c_static_pie
$RUSTC -O "$FIXTURE/p01/hello.rs" -o hello_rs
$RUSTC -O -C target-feature=+crt-static "$FIXTURE/p01/hello.rs" -o hello_rs_static
gcc -O2 "$FIXTURE/p01/spawn.c" -o spawn
gcc -O2 "$FIXTURE/p06/sleeper.c" -o sleeper_dyn
gcc -O2 -static "$FIXTURE/p06/sleeper.c" -o sleeper_static
gcc -O2 "$FIXTURE/p06/whoami.c" -o whoami_dyn
gcc -O2 -static "$FIXTURE/p06/whoami.c" -o whoami_static 2> whoami_static.link.txt
gcc -O2 -static -fuse-ld=lld "$FIXTURE/p06/whoami.c" -o whoami_static_lld 2> whoami_static_lld.link.txt
$RUSTC --edition 2024 -O -C target-feature=+crt-static "$FIXTURE/p06/whoami.rs" -o whoami_rs_static 2> whoami_rs_static.link.txt
mkdir -p libc_a
(cd libc_a && ar x /usr/lib/libc.a getpwnam.o)
all="hello_c_dyn hello_c_static hello_c_static_pie hello_rs hello_rs_static"

{
    echo "\$ wc -c $all"
    wc -c $all
    echo "\$ file $all | sed 's/, BuildID[^,]*//'"
    for b in $all; do file "$b" | sed 's/, BuildID[^,]*//'; done
    for b in $all; do
        echo "\$ ldd ./$b"
        ldd "./$b" 2>&1 || true
    done
    for b in $all; do
        echo "\$ readelf -lW $b | grep -cE 'INTERP|DYNAMIC'"
        readelf -lW "$b" | grep -cE '^ +(INTERP|DYNAMIC) ' || true
    done
    echo "\$ rustup +1.98.0 target list --installed"
    rustup +1.98.0 target list --installed
} > "$RES/p06-files.txt"

{
    echo "system calls after execve and before the write of the greeting:"
    for b in $all; do
        strace -o "strace_$b.txt" "./$b" > "stdout_$b.txt"
        n=$(awk '/^write\(1, "hello/ { print NR - 2; exit }' "strace_$b.txt")
        printf '  %-20s %3d\n' "$b" "$n"
    done
} > "$RES/p06-syscalls.txt"

{
    echo "\$ uptime"
    uptime
    echo "each program alone, pinned to CPU 2:"
    for b in $all; do
        echo "\$ taskset -c 2 ./spawn 1000 ./$b"
        taskset -c 2 ./spawn 1000 "./$b"
    done
    echo "the five programs in turn, pinned to CPU 2:"
    echo "\$ taskset -c 2 ./spawn 1000 ./hello_c_dyn ./hello_c_static ./hello_c_static_pie ./hello_rs ./hello_rs_static"
    taskset -c 2 ./spawn 1000 ./hello_c_dyn ./hello_c_static ./hello_c_static_pie ./hello_rs ./hello_rs_static
    echo "\$ uptime"
    uptime
} > "$RES/p06-startup-time.txt"

{
    echo "the 'each program alone' runs of p06-startup-time.txt, in one table:"
    awk '/^each program alone/ { on = 1; next } /^the five programs in turn/ { on = 0 }
         on && /^program/ && !header { print; header = 1 } on && /^hello/ { print }' "$RES/p06-startup-time.txt"
} > "$RES/p06-startup-alone.txt"

sync sleeper_dyn sleeper_static
{
    echo "\$ sh memory.sh 1"
    sh "$FIXTURE/p06/memory.sh" 1
    echo "\$ sh memory.sh 3"
    sh "$FIXTURE/p06/memory.sh" 3
} > "$RES/p06-memory.txt"

{
    echo "\$ gcc -O2 -static whoami.c -o whoami_static"
    sed "s|/tmp/[^:]*\.o|whoami.o|" whoami_static.link.txt
    echo "\$ grep -E '^passwd' /etc/nsswitch.conf"
    grep -E '^passwd' /etc/nsswitch.conf
    for b in whoami_dyn whoami_static; do
        for name in root nobody-here; do
            echo "\$ ./$b $name"
            "./$b" "$name" 2>&1 || echo "exit status $?"
        done
    done
    echo "\$ strace -e trace=openat ./whoami_static nobody-here"
    strace -e trace=openat ./whoami_static nobody-here 2>&1 || true
    echo "\$ gdb -x crash.py --args ./whoami_static nobody-here"
    gdb -q -batch -x "$FIXTURE/p06/crash.py" --args ./whoami_static nobody-here 2>&1 \
        | grep -vE 'This GDB supports|debuginfod|Debuginfod|answered N|permanent|libthread_db' || true
    echo "\$ pacman -Qo /usr/lib/libc.a /usr/lib/libc.so.6 /usr/lib/libnss_systemd.so.2"
    pacman -Qo /usr/lib/libc.a /usr/lib/libc.so.6 /usr/lib/libnss_systemd.so.2 || true
} > "$RES/p06-nss.txt"

{
    echo "\$ ar x /usr/lib/libc.a getpwnam.o && readelf -p .gnu.warning.getpwnam getpwnam.o"
    readelf -p .gnu.warning.getpwnam libc_a/getpwnam.o
    echo "\$ gcc -O2 -static -fuse-ld=lld whoami.c -o whoami_static_lld  (what it printed:)"
    cat whoami_static_lld.link.txt
    echo "\$ rustc --edition 2024 -O -C target-feature=+crt-static whoami.rs -o whoami_rs_static  (what it printed:)"
    cat whoami_rs_static.link.txt
    for name in root nobody-here; do
        echo "\$ ./whoami_rs_static $name"
        ./whoami_rs_static "$name" 2>&1 || echo "exit status $?"
    done
} > "$RES/p06-lld-and-rust.txt"
