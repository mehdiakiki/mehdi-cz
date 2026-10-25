#!/bin/sh
# Shows the relocations the compiler leaves in an object file and how the linker and the loader fill them.
set -eu
cd "$B"
gcc -O2 -c "$FIXTURE/p05/holes.c" -o holes.o
gcc -O2 -c "$FIXTURE/p05/other.c" -o other.o
gcc holes.o other.o -o prog
gcc -no-pie holes.o other.o -o prog_nopie
gcc -O2 -fPIC -c "$FIXTURE/p05/holes.c" -o holes_pic.o
gcc -O2 "$FIXTURE/p01/hello.c" -o hello_c_dyn
gcc -O2 "$FIXTURE/p05/tsc.c" -o tsc
$RUSTC -O "$FIXTURE/p01/hello.rs" -o hello_rs
$RUSTC -O -C link-arg=-Wl,-z,pack-relative-relocs "$FIXTURE/p01/hello.rs" -o hello_rs_relr
count="sh $FIXTURE/p05/count_relocs.sh"

{
    echo "\$ objdump -dr holes.o"
    objdump -dr holes.o | sed -n '/<read_counter>:/,$p'
    echo "\$ readelf -rW holes.o"
    readelf -rW holes.o
} > "$RES/p05-object.txt"

{
    echo "\$ ./prog"
    ./prog
    echo "\$ objdump -d prog (the same three functions)"
    objdump -d prog | grep -A1 -E '<(read_counter|read_total|call_greet)>:'
    echo "\$ nm prog | grep -wE 'counter|total|pointer|greet'"
    nm prog | grep -wE 'counter|total|pointer|greet'
    echo "\$ readelf -x .data prog"
    readelf -x .data prog
    echo "\$ readelf -rW prog"
    readelf -rW prog
    echo "\$ nm prog | grep -E '__dso_handle|frame_dummy|__do_global_dtors_aux\$|_ITM|gmon'"
    nm prog | grep -E '__dso_handle|frame_dummy|__do_global_dtors_aux$|_ITM|gmon'
} > "$RES/p05-linked.txt"

{
    echo "\$ gcc -no-pie holes.o other.o -o prog_nopie && ./prog_nopie"
    ./prog_nopie
    echo "\$ nm prog_nopie | grep -wE 'counter|pointer'"
    nm prog_nopie | grep -wE 'counter|pointer'
    echo "\$ readelf -x .data prog_nopie"
    readelf -x .data prog_nopie
    echo "\$ readelf -rW prog_nopie | grep -c RELATIVE"
    readelf -rW prog_nopie | grep -c RELATIVE || true
    echo "\$ gcc -O2 -fPIC -c holes.c -o holes_pic.o && objdump -dr holes_pic.o"
    objdump -dr holes_pic.o | sed -n '/<read_counter>:/,$p' | grep -vE 'nop|^$'
} > "$RES/p05-nopie-and-pic.txt"

{
    for f in hello_c_dyn hello_rs /usr/lib/libc.so.6 hello_rs_relr; do
        echo "\$ count relocations by type: $f"
        $count "$f"
    done
    echo "\$ readelf -SW hello_rs | grep -E 'rela?r?\.dyn'"
    readelf -SW hello_rs | grep -E '\.rela?r?\.dyn'
    echo "\$ readelf -SW hello_rs_relr | grep -E 'rela?r?\.dyn'"
    readelf -SW hello_rs_relr | grep -E '\.rela?r?\.dyn'
    for f in hello_c_dyn hello_rs hello_rs_relr; do
        echo "\$ readelf -d $f | grep -E 'FLAGS|RELACOUNT'"
        readelf -d "$f" | grep -E 'FLAGS|RELACOUNT'
    done
    echo "\$ readelf -d /usr/lib/libc.so.6 | grep -E 'FLAGS|RELR'"
    readelf -d /usr/lib/libc.so.6 | grep -E 'FLAGS|RELR'
    for f in prog hello_rs; do
        echo "\$ python3 reloc_sections.py $f (where the RELATIVE relocations point)"
        python3 -I "$FIXTURE/p05/reloc_sections.py" "$f"
    done
} > "$RES/p05-counts.txt"

{
    echo "\$ uptime"
    uptime
    for f in hello_c_dyn hello_rs hello_rs_relr; do
        echo "\$ LD_DEBUG=statistics ./$f"
        LD_DEBUG=statistics "./$f" 2>&1
    done
    echo "\$ ./tsc"
    ./tsc
    echo "\$ python3 ldstats.py 21 ./hello_c_dyn ./hello_rs ./hello_rs_relr"
    python3 -I "$FIXTURE/p05/ldstats.py" 21 ./hello_c_dyn ./hello_rs ./hello_rs_relr
    echo "\$ uptime"
    uptime
} > "$RES/p05-ld-debug-statistics.txt"
