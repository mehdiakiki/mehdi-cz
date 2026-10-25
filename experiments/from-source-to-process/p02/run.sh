#!/bin/sh
# Reads the ELF headers, segments and sections of the hello programs, then removes or breaks parts of them.
set -eu
gcc -O2 ../p01/hello.c -o "$B/hello_c_dyn"
gcc -O2 -static ../p01/hello.c -o "$B/hello_c_static"
$RUSTC -O ../p01/hello.rs -o "$B/hello_rs"
cd "$B"

{
    echo "\$ readelf -h hello_c_dyn"
    readelf -h hello_c_dyn
    for b in hello_c_static hello_rs; do
        echo "\$ readelf -h $b | grep -E 'Type|Entry|Number of'"
        readelf -h "$b" | grep -E 'Type|Entry|Number of'
    done
} > "$RES/p02-elf-header.txt"

{
    for b in hello_c_dyn hello_c_static hello_rs; do
        echo "\$ readelf -lW $b"
        readelf -lW "$b"
    done
} > "$RES/p02-segments.txt"

{
    echo "\$ readelf -SW hello_c_dyn"
    readelf -SW hello_c_dyn
} > "$RES/p02-sections.txt"

gcc -O2 -Wl,-z,noseparate-code "$FIXTURE/p01/hello.c" -o hello_c_noseparate
{
    echo "\$ gcc -O2 -Wl,-z,noseparate-code hello.c -o hello_c_noseparate"
    echo "\$ readelf -lW hello_c_noseparate | grep -E 'LOAD|RELRO'"
    readelf -lW hello_c_noseparate | grep -E 'LOAD|RELRO'
    echo "\$ wc -c hello_c_dyn hello_c_noseparate"
    wc -c hello_c_dyn hello_c_noseparate
    for b in hello_c_dyn hello_c_noseparate; do
        echo "\$ count zero bytes in $b"
        python3 -c 'import sys; d = open(sys.argv[1], "rb").read(); print(d.count(0), "of", len(d), "bytes are zero")' "$b"
    done
    echo "\$ ./hello_c_noseparate"
    ./hello_c_noseparate
    echo "\$ ld --help | grep separate-code"
    ld --help | grep separate-code
} > "$RES/p02-separate-code.txt"

strip -o hello_c_dyn.strip hello_c_dyn
objcopy --strip-section-headers hello_c_dyn hello_c_dyn.noshdr
strip -o hello_rs.strip hello_rs
objcopy --strip-section-headers hello_rs.strip hello_rs.noshdr
{
    echo "\$ strip -o hello_c_dyn.strip hello_c_dyn"
    echo "\$ objcopy --strip-section-headers hello_c_dyn hello_c_dyn.noshdr"
    echo "\$ strip -o hello_rs.strip hello_rs"
    echo "\$ objcopy --strip-section-headers hello_rs.strip hello_rs.noshdr"
    echo "\$ wc -c hello_c_dyn hello_c_dyn.strip hello_c_dyn.noshdr hello_rs hello_rs.strip hello_rs.noshdr"
    wc -c hello_c_dyn hello_c_dyn.strip hello_c_dyn.noshdr hello_rs hello_rs.strip hello_rs.noshdr
    echo "\$ readelf -S hello_c_dyn.noshdr"
    readelf -S hello_c_dyn.noshdr
    echo "\$ readelf -h hello_c_dyn.noshdr | grep 'section headers'"
    readelf -h hello_c_dyn.noshdr | grep 'section headers'
    echo "\$ readelf -lW hello_c_dyn.noshdr | grep -E 'LOAD|INTERP'"
    readelf -lW hello_c_dyn.noshdr | grep -E 'LOAD|INTERP'
    echo "\$ ./hello_c_dyn.noshdr; ./hello_rs.noshdr"
    ./hello_c_dyn.noshdr
    ./hello_rs.noshdr
    echo "\$ nm hello_c_dyn.noshdr"
    nm hello_c_dyn.noshdr 2>&1 || true
    echo "\$ objdump -d hello_c_dyn.noshdr"
    objdump -d hello_c_dyn.noshdr 2>&1 || true
} > "$RES/p02-strip.txt"

python3 -I "$FIXTURE/p02/patch_interp.py" hello_c_dyn hello_c_dyn.badinterp
chmod +x hello_c_dyn.badinterp
{
    echo "\$ readelf -lW hello_c_dyn.badinterp | grep interpreter"
    readelf -lW hello_c_dyn.badinterp | grep interpreter
    echo "\$ ls -l hello_c_dyn.badinterp | cut -c1-10"
    ls -l hello_c_dyn.badinterp | cut -c1-10
    echo "\$ sh -c ./hello_c_dyn.badinterp"
    sh -c ./hello_c_dyn.badinterp 2>&1 || echo "exit status $?"
    echo "\$ strace ./hello_c_dyn.badinterp"
    strace ./hello_c_dyn.badinterp 2>&1 | head -n 1 || true
} > "$RES/p02-bad-interpreter.txt"

$RUSTC -O -C strip=debuginfo "$FIXTURE/p01/hello.rs" -o hello_rs_strip_debuginfo
$RUSTC -O -C strip=symbols "$FIXTURE/p01/hello.rs" -o hello_rs_strip_symbols
{
    echo "\$ size -A hello_rs | sort -k2 -nr | head -n 12"
    size -A hello_rs | sort -k2 -nr | head -n 12
    echo "\$ size -A hello_rs | awk '/^[.]debug/ { s += \$2 } END { print s }'"
    size -A hello_rs | awk '/^[.]debug/ { s += $2 } END { print s }'
    echo "\$ size hello_c_dyn hello_c_static hello_rs"
    size hello_c_dyn hello_c_static hello_rs
    echo "\$ wc -c hello_rs hello_rs_strip_debuginfo hello_rs_strip_symbols"
    wc -c hello_rs hello_rs_strip_debuginfo hello_rs_strip_symbols
    echo "\$ readelf --debug-dump=info hello_rs | grep -A8 DW_TAG_compile_unit | grep DW_AT_name"
    readelf --debug-dump=info hello_rs 2>/dev/null | grep -A8 DW_TAG_compile_unit | grep DW_AT_name
    echo "\$ readelf -p .comment hello_rs"
    readelf -p .comment hello_rs
    echo "\$ readelf -p .comment hello_c_dyn"
    readelf -p .comment hello_c_dyn
} > "$RES/p02-rust-size.txt"
