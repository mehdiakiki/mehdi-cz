#!/bin/sh
# How a process ends: stdio buffers with exit and _exit, exit handlers, process::exit in Rust,
# exit codes and signals, exit_group with a second thread, a zombie, and what the kernel cleans up.
set -eu
ulimit -c 0
cp buffering.c handlers.c codes.c threads_exit.c zombie.c exit.rs "$B/"
cd "$B"

gcc -O2 -Wall -Wextra buffering.c -o buffering
gcc -O2 -Wall -Wextra handlers.c -o handlers
gcc -O2 -Wall -Wextra codes.c -o codes
gcc -O2 -Wall -Wextra -pthread threads_exit.c -o threads_exit
gcc -O2 -Wall -Wextra zombie.c -o zombie
$RUSTC --edition 2024 -O exit.rs -o exit_rs

{
    echo "\$ ./buffering exit line | cat   (stdout is a pipe)"
    ./buffering exit line | cat
    echo "\$ ./buffering _exit line | cat"
    ./buffering _exit line | cat
    echo "\$ script -q -c './buffering _exit line' /dev/null   (stdout is a terminal)"
    script -q -c './buffering _exit line' /dev/null | tr -d '\r'
    echo "bytes that arrived, for each case:"
    printf '  %-9s %-6s %-22s %s\n' stdout end printed bytes
    for out in pipe terminal; do
        for end in exit _exit; do
            for what in line text; do
                if [ "$out" = pipe ]; then
                    n=$(./buffering "$end" "$what" | wc -c)
                else
                    n=$(script -q -c "./buffering $end $what" /dev/null | tr -d '\r' | wc -c)
                fi
                if [ "$what" = line ]; then text="a line with a newline"; else text="no newline here"; fi
                printf '  %-9s %-6s %-22s %s\n' "$out" "$end" "$text" "$n"
            done
        done
    done
    echo "\$ strace -e trace=write,exit_group ./buffering exit text > out.txt"
    strace -e trace=write,exit_group ./buffering exit text 2>&1 > out.txt
    echo "\$ strace -e trace=write,exit_group ./buffering _exit text > out.txt"
    strace -e trace=write,exit_group ./buffering _exit text 2>&1 > out.txt
} > "$RES/p20-buffering.txt"

{
    echo "\$ ./handlers | cat"
    ./handlers | cat
    echo "\$ strace -e trace=write,exit_group ./handlers > out.txt"
    strace -e trace=write,exit_group ./handlers 2>&1 > out.txt
    echo "\$ ./handlers now | cat   (ends with _exit)"
    ./handlers now | cat
} > "$RES/p20-handlers.txt"

{
    for mode in return exit abort; do
        echo "\$ ./exit_rs $mode > out.txt 2> err.txt"
        status=0
        ./exit_rs "$mode" > out.txt 2> err.txt || status=$?
        echo "  exit status: $status"
        echo "  stdout: $(cat out.txt)"
        echo "  stderr: $(cat err.txt)"
    done
    strace -e trace=write,exit_group,sigaltstack,munmap -o strace_exit.txt ./exit_rs exit > /dev/null || true
    echo "\$ strace -e trace=write,exit_group,sigaltstack,munmap ./exit_rs exit > /dev/null   (from the write on)"
    awk '/^write\(1/ { p = 1 } p' strace_exit.txt
} > "$RES/p20-rust.txt"

{
    echo "\$ ./codes exit > out.txt; cat out.txt   (the children end with exit)"
    ./codes exit > out.txt
    cat out.txt
    echo "\$ ./codes _exit > out.txt; cat out.txt   (the children end with _exit)"
    ./codes _exit > out.txt
    cat out.txt
    echo "\$ sh -c 'exit 300'; echo \$?"
    sh -c 'exit 300' || echo "$?"
    echo "\$ sh -c 'kill -TERM \$\$'; echo \$?"
    sh -c 'kill -TERM $$' || echo "$?"
    echo "\$ sh -c 'kill -KILL \$\$'; echo \$?"
    sh -c 'kill -KILL $$' || echo "$?"
} > "$RES/p20-codes.txt"

{
    strace -f -o strace_threads.txt -e trace=exit_group,pause ./threads_exit || true
    echo "\$ strace -f -e trace=exit_group,pause ./threads_exit"
    cat strace_threads.txt
} > "$RES/p20-threads.txt"

{
    echo "\$ ./zombie"
    ./zombie
} > "$RES/p20-zombie.txt"
