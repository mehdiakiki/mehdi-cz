#!/bin/sh
# Reads argc, argv, envp and the auxiliary vector from the initial stack, in C and in Rust.
set -eu
cd "$B"
gcc -O2 -Wall -Wextra "$FIXTURE/p11/auxv.c" -o auxv
$RUSTC --edition 2024 -O "$FIXTURE/p11/args.rs" -o args_rs
big=$(python3 -c "print('x' * 4000)")
arch=$(uname -m)

{
    echo "\$ env -i A=1 B=two ./auxv one"
    env -i A=1 B=two ./auxv one
    echo "\$ readelf -h auxv | grep -E 'Entry|program headers'"
    readelf -h auxv | grep -E 'Entry|program headers'
} > "$RES/p11-auxv.txt"

{
    echo "\$ env -i LD_SHOW_AUXV=1 /bin/true"
    env -i LD_SHOW_AUXV=1 /bin/true
} > "$RES/p11-ld-show-auxv.txt"

{
    echo "\$ setarch $arch -R env -i A=1 ./auxv | grep -E 'argc =|local|stack'"
    setarch "$arch" -R env -i A=1 ./auxv | grep -E 'argc =|local|stack'
    echo "\$ setarch $arch -R env -i A=1 BIG=(4000 times x) ./auxv | grep -E 'argc =|local|stack'"
    setarch "$arch" -R env -i A=1 BIG="$big" ./auxv | grep -E 'argc =|local|stack'
} > "$RES/p11-environment.txt"

{
    echo "\$ env -i ./args_rs"
    env -i ./args_rs
} > "$RES/p11-rust.txt"
