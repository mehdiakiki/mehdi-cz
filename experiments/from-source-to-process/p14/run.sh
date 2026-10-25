#!/bin/sh
# Measures fork() and copy-on-write for parents with 0 to 2 GiB of touched memory.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra "$FIXTURE/p14/cow.c" -o cow
gcc -O2 -Wall -Wextra "$FIXTURE/p14/forktime.c" -o forktime
available=$(awk '/MemAvailable/ { print $2 }' /proc/meminfo)
big=2048
if [ "$available" -lt 6000000 ]; then
    big=0
fi

{
    echo "\$ uptime"
    uptime
    echo "\$ grep MemAvailable /proc/meminfo"
    grep MemAvailable /proc/meminfo
    for m in 0 1 16 64 256 1024 $big; do
        echo "\$ taskset -c 2 ./forktime $m"
        taskset -c 2 ./forktime "$m"
    done
} > "$RES/p14-forktime.txt"

{
    for run in "256 write nohuge" "1024 write nohuge" "1024 read nohuge" "$big read nohuge" "256 write huge"; do
        echo "\$ taskset -c 2 ./cow $run"
        taskset -c 2 ./cow $run
    done
    echo "\$ uptime"
    uptime
} > "$RES/p14-cow.txt"
