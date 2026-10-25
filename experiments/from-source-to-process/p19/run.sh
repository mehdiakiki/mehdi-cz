#!/bin/sh
# Thread-local variables in C, in an executable and in a shared library, and in Rust:
# the generated code, the ELF data, the thread pointer of each thread, and the access cost.
set -eu
cp threads.c libtls.c cost.c tls.rs dtors.gdb "$B/"
cd "$B"

gcc -O2 -Wall -Wextra -pthread threads.c -o threads
gcc -O2 -Wall -Wextra -fPIC -c threads.c -o threads_pic.o
gcc -pthread threads_pic.o -o threads_pic
gcc -O2 -Wall -Wextra -fPIC -shared -Wl,-soname,libtls_gd.so libtls.c -o libtls_gd.so
gcc -O2 -Wall -Wextra -fPIC -shared -ftls-model=initial-exec -Wl,-soname,libtls_ie.so libtls.c -o libtls_ie.so
gcc -O2 -Wall -Wextra cost.c -o cost_gd -L. -ltls_gd -Wl,-rpath,'$ORIGIN'
gcc -O2 -Wall -Wextra cost.c -o cost_ie -L. -ltls_ie -Wl,-rpath,'$ORIGIN'
$RUSTC --edition 2024 -O tls.rs -o tls_rs

# Prints the disassembly of one function: function_code FILE NAME [objdump options]
function_code() {
    file=$1
    name=$2
    shift 2
    objdump -d --no-show-raw-insn "$@" "$file" | awk -v f="<$name>:" '$2 == f { p = 1 } p && /^$/ { exit } p'
}

{
    strace -f -e trace=arch_prctl,clone3 -o strace_threads.txt ./threads > threads_out.txt
    echo "\$ strace -f -e trace=arch_prctl,clone3 -o strace_threads.txt ./threads"
    cat threads_out.txt
    echo "\$ cat strace_threads.txt"
    grep -v '+++ exited' strace_threads.txt
} > "$RES/p19-threads.txt"

{
    echo "\$ objdump -d --no-show-raw-insn threads   (the function bump)"
    function_code threads bump
    echo "\$ readelf -lW threads | grep -E 'Type|LOAD|TLS'"
    readelf -lW threads | grep -E 'Type|LOAD|TLS'
    echo "\$ readelf -SW threads | grep -E 'Nr\]|\.tdata|\.tbss'"
    readelf -SW threads | grep -E 'Nr\]|\.tdata|\.tbss'
    echo "\$ readelf -x .tdata threads"
    readelf -x .tdata threads
    echo "\$ readelf -sW threads | grep ' TLS '"
    readelf -sW threads | grep ' TLS '
} > "$RES/p19-elf.txt"

{
    echo "\$ objdump -dr --no-show-raw-insn threads_pic.o   (bump compiled with -fPIC, before linking)"
    function_code threads_pic.o bump -r
    echo "\$ objdump -d --no-show-raw-insn threads_pic   (the same object after linking into an executable)"
    function_code threads_pic bump
    echo "\$ objdump -d --no-show-raw-insn libtls_gd.so   (default model for -fPIC)"
    function_code libtls_gd.so lib_tls_read
    echo "\$ readelf -rW libtls_gd.so | grep -E 'DTP|TPOFF'"
    readelf -rW libtls_gd.so | grep -E 'DTP|TPOFF'
    echo "\$ objdump -d --no-show-raw-insn libtls_ie.so   (-ftls-model=initial-exec)"
    function_code libtls_ie.so lib_tls_read
    echo "\$ readelf -rW libtls_ie.so | grep -E 'DTP|TPOFF'"
    readelf -rW libtls_ie.so | grep -E 'DTP|TPOFF'
    echo "\$ readelf -d libtls_ie.so | grep FLAGS"
    readelf -d libtls_ie.so | grep FLAGS
    echo "\$ objdump -d --no-show-raw-insn libtls_gd.so   (the function that returns a constant)"
    function_code libtls_gd.so lib_constant
} > "$RES/p19-models.txt"

{
    echo "\$ uptime"
    uptime
    echo "\$ ps -eo psr,pcpu,comm --sort=-pcpu | head -n 6   (the busiest processes and their CPU)"
    ps -eo psr,pcpu,comm --sort=-pcpu | head -n 6
    echo "\$ taskset -c 4 ./cost_gd   (library compiled with the default model)"
    taskset -c 4 ./cost_gd
    echo "\$ taskset -c 4 ./cost_ie   (library compiled with -ftls-model=initial-exec)"
    taskset -c 4 ./cost_ie
    echo "\$ taskset -c 4 ./cost_gd   (again)"
    taskset -c 4 ./cost_gd
    echo "\$ taskset -c 4 ./cost_ie   (again)"
    taskset -c 4 ./cost_ie
    echo "\$ ps -eo psr,pcpu,comm --sort=-pcpu | head -n 6   (after the measurements)"
    ps -eo psr,pcpu,comm --sort=-pcpu | head -n 6
} > "$RES/p19-cost.txt"

{
    echo "\$ rustc --edition 2024 -O tls.rs -o tls_rs"
    echo "\$ ./tls_rs"
    ./tls_rs
    for f in bump_plain bump_lazy bump_noisy; do
        echo "\$ objdump -d --no-show-raw-insn -C tls_rs   (the function $f)"
        function_code tls_rs "tls::$f" -C
    done
    echo "\$ readelf -lW tls_rs | grep TLS"
    readelf -lW tls_rs | grep TLS
    echo "\$ readelf -sW -C tls_rs | grep ' TLS '"
    readelf -sW -C tls_rs | grep ' TLS '
    echo "\$ nm -D tls_rs | grep cxa_thread"
    nm -D tls_rs | grep cxa_thread
} > "$RES/p19-rust.txt"

{
    echo "\$ gdb -q -batch -x dtors.gdb ./tls_rs"
    gdb -q -batch -x dtors.gdb ./tls_rs 2>&1 | grep -v -E '^\[New Thread|^\[Thread debugging|^Using host libthread_db|^\[Inferior'
} > "$RES/p19-rust-dtor.txt"
