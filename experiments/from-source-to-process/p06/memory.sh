#!/bin/sh
# Starts N copies of each sleeper, prints the memory summary of the last one, then stops them.
set -eu
n=$1
dyn_pids=""
static_pids=""
i=0
while [ "$i" -lt "$n" ]; do
    ./sleeper_dyn &
    dyn_pids="$dyn_pids $!"
    ./sleeper_static &
    static_pids="$static_pids $!"
    i=$((i + 1))
done
sleep 0.5
last_dyn=${dyn_pids##* }
last_static=${static_pids##* }
for entry in "sleeper_dyn $last_dyn" "sleeper_static $last_static"; do
    b=${entry% *}
    pid=${entry#* }
    echo "$b, $n running, /proc/$pid/smaps_rollup:"
    grep -E '^(Rss|Pss|Shared_Clean|Shared_Dirty|Private_Clean|Private_Dirty):' "/proc/$pid/smaps_rollup"
done
echo "sleeper_dyn, the libc.so.6 lines of /proc/$last_dyn/smaps:"
awk '/^[0-9a-f]+-/ { perm = $2; name = $6 } /^Rss:/ { rss = $2 }
     /^Pss:/ && name ~ /libc\.so\.6/ { printf "  %s libc.so.6  Rss %4d kB  Pss %3d kB\n", perm, rss, $2 }' "/proc/$last_dyn/smaps"
kill $dyn_pids $static_pids
wait
