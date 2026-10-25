#!/bin/sh
# Builds a shared library with a soname and shows how the loader searches for it.
set -eu
cd "$B"
rm -rf lib other moved
mkdir -p lib other moved
gcc -O2 -fPIC -shared -DGREETING='"lib/libgreet.so.1"' -Wl,-soname,libgreet.so.1 "$FIXTURE/p07/greet.c" -o lib/libgreet.so.1.0
ln -s libgreet.so.1.0 lib/libgreet.so.1
ln -s libgreet.so.1 lib/libgreet.so
gcc -O2 -fPIC -shared -DGREETING='"other/libgreet.so.1"' -Wl,-soname,libgreet.so.1 "$FIXTURE/p07/greet.c" -o other/libgreet.so.1
gcc -O2 "$FIXTURE/p07/main.c" -Llib -lgreet -o prog
gcc -O2 "$FIXTURE/p07/main.c" -Llib -lgreet -Wl,-rpath,'$ORIGIN/lib' -o prog_runpath
gcc -O2 "$FIXTURE/p07/main.c" -Llib -lgreet -Wl,--disable-new-dtags,-rpath,'$ORIGIN/lib' -o prog_rpath
$RUSTC -O "$FIXTURE/p01/hello.rs" -o hello_rs
short() { sed "s|$B|DIR|g"; }

{
    echo "\$ ls -l lib (type, name, target)"
    ls -l lib | awk 'NR > 1 { print $1, $9, $10, $11 }'
    echo "\$ readelf -d lib/libgreet.so.1.0 | grep SONAME"
    readelf -d lib/libgreet.so.1.0 | grep SONAME
    echo "\$ gcc -O2 main.c -Llib -lgreet -o prog && readelf -d prog | grep NEEDED"
    readelf -d prog | grep NEEDED
} > "$RES/p07-build.txt"

{
    echo "\$ ./prog"
    ./prog 2>&1 || echo "exit status $?"
    echo "\$ LD_DEBUG=libs ./prog"
    LD_DEBUG=libs ./prog 2>&1 || true
} > "$RES/p07-not-found.txt"

{
    echo "\$ LD_LIBRARY_PATH=lib ./prog"
    LD_LIBRARY_PATH=lib ./prog
    echo "\$ LD_DEBUG=libs LD_LIBRARY_PATH=lib ./prog"
    LD_DEBUG=libs LD_LIBRARY_PATH=lib ./prog 2>&1
} > "$RES/p07-ld-library-path.txt"

{
    echo "\$ gcc -O2 main.c -Llib -lgreet -Wl,-rpath,'\$ORIGIN/lib' -o prog_runpath && readelf -d prog_runpath | grep PATH"
    readelf -d prog_runpath | grep PATH
    echo "\$ gcc -O2 main.c -Llib -lgreet -Wl,--disable-new-dtags,-rpath,'\$ORIGIN/lib' -o prog_rpath && readelf -d prog_rpath | grep PATH"
    readelf -d prog_rpath | grep PATH
    echo "\$ LD_DEBUG=libs ./prog_runpath (DIR is the build directory)"
    LD_DEBUG=libs ./prog_runpath 2>&1 | short
    cp -a prog_runpath lib moved/
    echo "\$ cp -a prog_runpath lib moved/ && cd / && DIR/moved/prog_runpath"
    (cd / && "$B/moved/prog_runpath")
    mv lib/libgreet.so.1 lib/libgreet.so.1.away
    echo "\$ mv lib/libgreet.so.1 lib/libgreet.so.1.away && ./prog_runpath"
    ./prog_runpath 2>&1 || echo "exit status $?"
    mv lib/libgreet.so.1.away lib/libgreet.so.1
} > "$RES/p07-runpath.txt"

{
    for p in prog_runpath prog_rpath; do
        echo "\$ LD_LIBRARY_PATH=other ./$p"
        LD_LIBRARY_PATH=other "./$p"
    done
    echo "\$ LD_LIBRARY_PATH=other LD_DEBUG=libs ./prog_rpath 2>&1 | grep -A1 -E 'find library|search path'"
    LD_LIBRARY_PATH=other LD_DEBUG=libs ./prog_rpath 2>&1 | grep -A1 -E 'find library|search path' | short
} > "$RES/p07-order.txt"

{
    echo "\$ ldconfig -p | head -n 1"
    ldconfig -p | head -n 1
    echo "\$ ldconfig -p | grep -E 'libc.so.6|libgcc_s.so.1'"
    ldconfig -p | grep -E 'libc\.so\.6|libgcc_s\.so\.1'
    echo "\$ cat /etc/ld.so.conf"
    cat /etc/ld.so.conf
    echo "\$ ls /etc/ld.so.conf.d /usr/lib/ld.so.conf.d"
    ls /etc/ld.so.conf.d /usr/lib/ld.so.conf.d 2>&1 || true
    echo "\$ /usr/lib/ld-linux-x86-64.so.2 --help | tail -n 4"
    /usr/lib/ld-linux-x86-64.so.2 --help | tail -n 4
    echo "\$ grep -c avx512f /proc/cpuinfo"
    grep -c avx512f /proc/cpuinfo || true
    echo "\$ LD_DEBUG=libs ./hello_rs 2>&1 | grep -A3 'find library=libgcc_s'"
    LD_DEBUG=libs ./hello_rs 2>&1 | grep -A3 'find library=libgcc_s'
} > "$RES/p07-cache.txt"
