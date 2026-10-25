#!/bin/sh
# Measures the cost of a function call, of system calls, and of clock_gettime through the vDSO.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra "$FIXTURE/p17/cost.c" -o cost
gcc -O2 -Wall -Wextra "$FIXTURE/p17/vdso_dump.c" -o vdso_dump
$RUSTC --edition 2024 -O "$FIXTURE/p17/cost.rs" -o cost_rs

{
    echo "\$ uptime"
    uptime
    echo "\$ taskset -c 2 ./cost   (a performance core)"
    taskset -c 2 ./cost
    echo "\$ taskset -c 10 ./cost   (an efficiency core)"
    taskset -c 10 ./cost
    echo "\$ taskset -c 2 ./cost_rs"
    taskset -c 2 ./cost_rs
    echo "\$ uptime"
    uptime
} > "$RES/p17-cost.txt"

{
    echo "\$ strace -c -e trace=getpid,clock_gettime ./cost 1000"
    strace -c -e trace=getpid,clock_gettime ./cost 1000 2>&1 > /dev/null
    echo "\$ strace -c -e trace=getpid,clock_gettime ./cost_rs 1000"
    strace -c -e trace=getpid,clock_gettime ./cost_rs 1000 2>&1 > /dev/null
} > "$RES/p17-strace.txt"

{
    echo "\$ ./vdso_dump vdso.so"
    ./vdso_dump vdso.so
    echo "\$ readelf -h vdso.so | grep -E 'Type|Machine'"
    readelf -h vdso.so | grep -E 'Type|Machine'
    echo "\$ readelf --dyn-syms -W vdso.so | grep FUNC"
    readelf --dyn-syms -W vdso.so | grep FUNC
    echo "\$ cat /sys/devices/system/clocksource/clocksource0/current_clocksource"
    cat /sys/devices/system/clocksource/clocksource0/current_clocksource
} > "$RES/p17-vdso.txt"

{
    echo "\$ grep -r . /sys/devices/system/cpu/vulnerabilities/ | sort"
    grep -r . /sys/devices/system/cpu/vulnerabilities/ | sed 's|/sys/devices/system/cpu/vulnerabilities/||' | sort
} > "$RES/p17-mitigations.txt"

{
    echo "\$ objdump -d --no-show-raw-insn cost   (the functions empty_function and call_empty)"
    objdump -d --no-show-raw-insn cost | awk '/<empty_function>:|<call_empty>:/ { p = 1 } p && /^$/ { p = 0 } p'
} > "$RES/p17-empty-function.txt"
