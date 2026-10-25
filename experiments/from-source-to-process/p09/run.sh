#!/bin/sh
# Preloads a library that counts allocations into C, Rust and coreutils programs, and into a static one.
set -eu
ulimit -c 0
cd "$B"
gcc -O2 -Wall -Wextra -fPIC -shared "$FIXTURE/p09/count.c" -o libcount.so
gcc -O2 -fPIC -shared "$FIXTURE/p09/naive_malloc.c" -o libnaive_malloc.so
gcc -O2 -fPIC -shared "$FIXTURE/p09/naive_calloc.c" -o libnaive_calloc.so
gcc -O2 "$FIXTURE/p09/usecalloc.c" -o usecalloc
gcc -O2 "$FIXTURE/p01/hello.c" -o hello_c_dyn
gcc -O2 -static "$FIXTURE/p01/hello.c" -o hello_c_static
$RUSTC -O "$FIXTURE/p01/hello.rs" -o hello_rs

{
    echo "\$ LD_PRELOAD=./libnaive_malloc.so /bin/true"
    LD_PRELOAD=./libnaive_malloc.so /bin/true 2>&1
    echo "\$ LD_PRELOAD=./libnaive_malloc.so ls /usr/lib > /dev/null"
    LD_PRELOAD=./libnaive_malloc.so ls /usr/lib 2>&1 > /dev/null
    echo "\$ LD_PRELOAD=./libnaive_malloc.so strace -e trace=close,write ls /usr/lib > /dev/null (the last lines)"
    LD_PRELOAD=./libnaive_malloc.so strace -e trace=close,write -o strace_ls.txt ls /usr/lib > /dev/null 2>&1
    tail -n 4 strace_ls.txt
    echo "\$ LD_PRELOAD=./libnaive_calloc.so ./usecalloc"
    LD_PRELOAD=./libnaive_calloc.so ./usecalloc 2>&1
} > "$RES/p09-naive.txt"

{
    echo "\$ nm -D libcount.so | grep -wE 'malloc|calloc|realloc|free|dlsym'"
    nm -D libcount.so | grep -wE 'malloc|calloc|realloc|free|dlsym'
    for p in ./hello_c_dyn ./hello_rs; do
        echo "\$ LD_PRELOAD=./libcount.so $p"
        LD_PRELOAD=./libcount.so "$p" 2>&1
    done
    echo "\$ LD_PRELOAD=./libcount.so ls /usr/lib > /dev/null"
    LD_PRELOAD=./libcount.so ls /usr/lib 2>&1 > /dev/null
    echo "\$ ls /usr/lib | wc -l"
    ls /usr/lib | wc -l
    echo "\$ LD_PRELOAD=./libcount.so ./hello_c_static"
    LD_PRELOAD=./libcount.so ./hello_c_static 2>&1
    echo "\$ nm -D hello_rs | grep -E 'alloc|free|memalign'"
    nm -D hello_rs | grep -E 'alloc|free|memalign'
} > "$RES/p09-count.txt"

{
    echo "\$ LD_DEBUG=bindings LD_PRELOAD=./libcount.so ./hello_c_dyn 2>&1 >/dev/null | grep the four allocation functions"
    LD_DEBUG=bindings LD_PRELOAD=./libcount.so ./hello_c_dyn 2>&1 >/dev/null | grep -E "symbol .(malloc|free|calloc|realloc)'"
    echo "\$ LD_DEBUG=scopes LD_PRELOAD=./libcount.so ./hello_c_dyn 2>&1 >/dev/null | head -n 4"
    LD_DEBUG=scopes LD_PRELOAD=./libcount.so ./hello_c_dyn 2>&1 >/dev/null | head -n 4
    echo "\$ LD_DEBUG=scopes ./hello_c_dyn 2>&1 >/dev/null | head -n 4"
    LD_DEBUG=scopes ./hello_c_dyn 2>&1 >/dev/null | head -n 4
} > "$RES/p09-bindings.txt"
