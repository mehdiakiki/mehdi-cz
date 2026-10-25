#!/bin/sh
# Shows in which section each kind of C and Rust variable is placed, and what .bss and .data cost in the file.
set -eu
gcc -O2 -Wall -Wextra places.c -o "$B/places"
gcc -O2 -DFIRST=0 buffer.c -o "$B/buffer0"
gcc -O2 -DFIRST=1 buffer.c -o "$B/buffer1"
sed 's/^char buffer/static char buffer/' buffer.c > "$B/buffer_static.c"
gcc -O2 -DFIRST=0 "$B/buffer_static.c" -o "$B/buffer_static"
gcc -O2 -DFIRST=1 "$B/buffer_static.c" -o "$B/buffer_static1"
$RUSTC --edition 2024 -O statics.rs -o "$B/statics"
cd "$B"

{
    echo "\$ ./places"
    ./places
    echo "\$ nm -n places (the variables of the program)"
    nm -n places | grep -E ' (main|counter|zeroed|limit|greeting|motto|hidden|calls\.[0-9]+|seeded\.[0-9]+)$'
    echo "\$ readelf -SW places (the sections they are in)"
    readelf -SW places | grep -E '\] \.(text|rodata|data\.rel\.ro|data|bss) '
} > "$RES/p03-c-places.txt"

{
    echo "\$ gcc -O2 -DFIRST=0 buffer.c -o buffer0"
    echo "\$ gcc -O2 -DFIRST=1 buffer.c -o buffer1"
    echo "\$ ./buffer0; ./buffer1"
    ./buffer0
    ./buffer1
    echo "\$ wc -c buffer0 buffer1"
    wc -c buffer0 buffer1
    echo "\$ size buffer0 buffer1"
    size buffer0 buffer1
    echo "\$ nm -S buffer0 buffer1 | grep buffer"
    nm -S buffer0 buffer1 | grep -E 'buffer$'
    for b in buffer0 buffer1; do
        echo "\$ readelf -lW $b | grep LOAD | tail -n 1"
        readelf -lW "$b" | grep LOAD | tail -n 1
    done
    echo "\$ the same file with 'static char buffer', FIRST=0"
    echo "\$ nm buffer_static | grep -c buffer"
    nm buffer_static | grep -c buffer || true
    echo "\$ size buffer_static"
    size buffer_static
} > "$RES/p03-bss-and-data.txt"

{
    echo "\$ ./statics"
    ./statics
    echo "\$ nm -C -n statics | grep statics::"
    nm -C -n statics | grep 'statics::'
    echo "\$ readelf -SW statics (the sections they are in)"
    readelf -SW statics | grep -E '\] \.(text|rodata|data\.rel\.ro|data|bss) '
    echo "\$ nm -C statics | grep -c MAX"
    nm -C statics | grep -c MAX || true
    echo "\$ objdump -d statics, inside statics::main, the instruction with 7"
    m=$(nm statics | awk '/7statics4main$/ { print $3 }')
    objdump -d --no-show-raw-insn --disassemble="$m" statics | grep -E '\$0x7,'
} > "$RES/p03-rust-statics.txt"

{
    echo "\$ the file with 'static char buffer', built with FIRST=0 and with FIRST=1"
    echo "\$ wc -c buffer_static buffer_static1"
    wc -c buffer_static buffer_static1
    echo "\$ nm buffer_static1 | grep -c buffer"
    nm buffer_static1 | grep -c buffer || true
} > "$RES/p03-static-sizes.txt"
