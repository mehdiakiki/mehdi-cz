#!/bin/sh
# Overflows the stack in C and in Rust, in the main thread and in a spawned thread.
set -eu
ulimit -c 0
cp overflow.c overflow.rs guards.py "$B/"
cd "$B"

{
    echo "\$ gcc -O2 -Wall -Wextra overflow.c -o overflow"
    gcc -O2 -Wall -Wextra overflow.c -o overflow 2>&1
    echo "\$ ulimit -s"
    ulimit -s
    echo "\$ ./overflow"
    ./overflow 2>&1 || echo "exit status $?"
    echo "\$ ./overflow report-no-altstack"
    ./overflow report-no-altstack 2>&1 || echo "exit status $?"
    echo "\$ ./overflow report"
    ./overflow report 2>&1 || echo "exit status $?"
    echo "\$ sh -c 'ulimit -s 16384; ./overflow report'"
    sh -c 'ulimit -s 16384; ./overflow report' 2>&1 || echo "exit status $?"
    echo "\$ kill -l 11; kill -l 6"
    kill -l 11
    kill -l 6
    echo "\$ cat /proc/sys/kernel/core_pattern"
    cat /proc/sys/kernel/core_pattern
} > "$RES/p18-c.txt"

{
    echo "\$ rustc --edition 2024 -O overflow.rs -o overflow_rs"
    $RUSTC --edition 2024 -O overflow.rs -o overflow_rs 2>&1
    echo "\$ ./overflow_rs main"
    ./overflow_rs main 2>&1 || echo "exit status $?"
    echo "\$ ./overflow_rs thread"
    ./overflow_rs thread 2>&1 || echo "exit status $?"
    echo "\$ RUST_MIN_STACK=8388608 ./overflow_rs thread"
    RUST_MIN_STACK=8388608 ./overflow_rs thread 2>&1 || echo "exit status $?"
} > "$RES/p18-rust.txt"

{
    strace -f -e trace=mmap,mprotect,munmap,clone3,sigaltstack,rt_sigaction,openat,write -o strace_thread.txt \
        ./overflow_rs thread > /dev/null 2>&1 || true
    echo "\$ strace -f -e trace=mmap,mprotect,munmap,clone3,sigaltstack,rt_sigaction,openat,write ./overflow_rs thread"
    echo "  (the 12 KiB area that the loader created at startup, then everything from the first rt_sigaction of SIGRT_1 on)"
    grep -m 1 -F 'mmap(NULL, 12288, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)' strace_thread.txt || true
    echo "  ..."
    awk '/rt_sigaction\(SIGRT_1/ { p = 1 } p' strace_thread.txt
} > "$RES/p18-strace-thread.txt"

{
    strace -e trace=mmap,mprotect,munmap,sigaltstack,rt_sigaction -o strace_main.txt ./overflow_rs main > /dev/null 2>&1 || true
    echo "\$ strace -e trace=mmap,mprotect,munmap,sigaltstack,rt_sigaction ./overflow_rs main"
    echo "  (the startup lines from the first rt_sigaction of SIGSEGV to the handler of SIGBUS, then everything from the signal on)"
    awk '/rt_sigaction\(SIGSEGV/ { p = 1 } p { print } p && /rt_sigaction\(SIGBUS, \{/ { exit }' strace_main.txt
    echo "  ..."
    awk '/^--- SIGSEGV/ { p = 1 } p' strace_main.txt
} > "$RES/p18-strace-main.txt"

{
    strace -f -k -e trace=mprotect -o strace_guards.txt ./overflow_rs thread > /dev/null 2>&1 || true
    echo "\$ strace -f -k -e trace=mprotect ./overflow_rs thread"
    echo "  (only the calls that make a page inaccessible, with the functions on the stack of each call)"
    python3 -I guards.py strace_guards.txt overflow_rs
} > "$RES/p18-guards.txt"

{
    strace -f -e trace=madvise,mprotect -o strace_madvise.txt ./overflow_rs thread > /dev/null 2>&1 || true
    echo "\$ strace -f -e trace=madvise,mprotect ./overflow_rs thread"
    cat strace_madvise.txt
} > "$RES/p18-strace-madvise.txt"
