#!/bin/sh
# Follows a call to puts through the PLT and the GOT, with lazy and immediate binding, and in Rust.
set -eu
cd "$B"
gcc -O2 "$FIXTURE/p08/twice.c" -o twice
gcc -O2 -Wl,-z,now "$FIXTURE/p08/twice.c" -o twice_now
gcc -O2 -fno-plt "$FIXTURE/p08/twice.c" -o twice_noplt
gcc -O2 "$FIXTURE/p08/printf_newline.c" -o printf_newline
gcc -O2 -fno-builtin "$FIXTURE/p08/firstcall.c" -o firstcall_lazy
gcc -O2 -fno-builtin -Wl,-z,now "$FIXTURE/p08/firstcall.c" -o firstcall_now
gcc -O2 "$FIXTURE/p05/tsc.c" -o tsc
$RUSTC -O "$FIXTURE/p01/hello.rs" -o hello_rs
quiet='This GDB supports|debuginfod|Debuginfod|answered N|permanent|libthread_db'
got() {
    gdb -q -batch -ex 'set debuginfod enabled off' "$@" 2>&1 | grep -vE "$quiet" | sed "s|$B/||"
}

{
    echo "\$ objdump -d twice (main)"
    objdump -d twice | awk '/<main>:/ { p = 1 } p { print } p && /ret/ { exit }'
    echo "\$ objdump -d -j .plt twice"
    objdump -d -j .plt twice | sed -n '/<puts@plt-0x10>:/,$p'
    echo "\$ readelf -rW twice (the .rela.plt part)"
    readelf -rW twice | sed -n '/rela.plt/,$p'
    echo "\$ readelf -SW twice | grep -E 'plt|got'"
    readelf -SW twice | grep -E 'plt|got'
    echo "\$ readelf -d twice | grep -E 'FLAGS|PLTGOT'"
    readelf -d twice | grep -E 'FLAGS|PLTGOT'
    echo "\$ readelf -n twice | grep -E 'feature|ISA'"
    readelf -n twice | grep -E 'feature|ISA'
    echo "\$ objdump -d printf_newline | grep call (main calls printf with a newline)"
    objdump -d printf_newline | awk '/<main>:/ { p = 1 } p && /call/ { print } p && /ret/ { exit }'
} > "$RES/p08-plt.txt"

got -ex 'break main' -ex 'break *main+16' -ex 'run > /dev/null' \
    -ex "x/gx &'puts@got.plt'" -ex "info symbol *(void **)&'puts@got.plt'" -ex 'continue' \
    -ex "x/gx &'puts@got.plt'" -ex "info symbol *(void **)&'puts@got.plt'" ./twice > "$RES/p08-gdb-lazy.txt"

{
    echo "\$ readelf -d twice_now | grep FLAGS"
    readelf -d twice_now | grep FLAGS
    echo "\$ readelf -SW twice_now | grep -E 'plt|got'"
    readelf -SW twice_now | grep -E 'plt|got'
    for p in twice twice_now; do
        echo "\$ readelf -lW $p | grep GNU_RELRO, and the sections in it"
        readelf -lW "$p" | grep GNU_RELRO
        readelf -lW "$p" | sed -n '/Section to Segment/,$p' | tail -n 1
    done
    echo "\$ gdb ./twice_now: the slot at main"
    got -ex 'break main' -ex 'run > /dev/null' -ex "x/gx &'puts@got.plt'" -ex "info symbol *(void **)&'puts@got.plt'" ./twice_now
    echo "\$ gdb ./twice with LD_BIND_NOW=1: the slot at main"
    got -ex 'set environment LD_BIND_NOW 1' -ex 'break main' -ex 'run > /dev/null' \
        -ex "x/gx &'puts@got.plt'" -ex "info symbol *(void **)&'puts@got.plt'" ./twice
} > "$RES/p08-bind-now.txt"

{
    echo "\$ uptime"
    uptime
    echo "\$ ./tsc"
    ./tsc
    echo "\$ python3 firstcall.py 101 ./firstcall_lazy ./firstcall_now 'LD_BIND_NOW=1 ./firstcall_lazy'"
    python3 -I "$FIXTURE/p08/firstcall.py" 101 ./firstcall_lazy ./firstcall_now 'LD_BIND_NOW=1 ./firstcall_lazy'
    echo "\$ uptime"
    uptime
} > "$RES/p08-first-call.txt"

{
    echo "\$ objdump -d twice_noplt (main)"
    objdump -d twice_noplt | awk '/<main>:/ { p = 1 } p { print } p && /ret/ { exit }'
    echo "\$ readelf -rW twice_noplt | grep puts"
    readelf -rW twice_noplt | grep puts
    echo "\$ readelf -SW twice_noplt | grep -cE '\\] \\.plt '"
    readelf -SW twice_noplt | grep -cE '\] \.plt ' || true
} > "$RES/p08-no-plt.txt"

{
    echo "\$ readelf -d hello_rs | grep FLAGS"
    readelf -d hello_rs | grep FLAGS
    echo "\$ readelf -rW hello_rs | grep -E ' write@|JUMP_SLOT'"
    readelf -rW hello_rs | grep -E ' write@|JUMP_SLOT'
    echo "\$ objdump -d hello_rs | grep the calls through the GOT slot of write"
    slot=$(readelf -rW hello_rs | awk '/ write@/ { sub(/^0+/, "", $1); print $1 }')
    objdump -d hello_rs | grep -E "call +\*0x[0-9a-f]+\(%rip\) +# $slot " | head -n 1
    first=$(objdump -d hello_rs | grep -E "call +\*0x[0-9a-f]+\(%rip\) +# $slot " | head -n 1 | awk '{ sub(":", "", $1); print $1 }')
    echo "\$ addr2line -f -C -e hello_rs 0x$first | head -n 1"
    addr2line -f -C -e hello_rs "0x$first" | head -n 1
    echo "\$ objdump -d hello_rs | grep -cE 'call +\\*0x[0-9a-f]+\\(%rip\\)'"
    objdump -d hello_rs | grep -cE 'call +\*0x[0-9a-f]+\(%rip\)'
    echo "\$ objdump -d hello_rs | grep -oE 'call +[0-9a-f]+ <.*@plt>' | awk '{ print \$3 }' | sort | uniq -c"
    objdump -d hello_rs | grep -oE 'call +[0-9a-f]+ <.*@plt>' | awk '{ print $3 }' | sort | uniq -c
} > "$RES/p08-rust.txt"
