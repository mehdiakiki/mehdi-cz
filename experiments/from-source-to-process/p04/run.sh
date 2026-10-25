#!/bin/sh
# Compiles two C files separately, links them in different ways, and does the same with a Rust program.
set -eu
cp main.c greet.c greet_int.c nodecl.c missing.rs "$B/"
cd "$B"

{
    echo "\$ gcc -O2 -c main.c -o main.o"
    gcc -O2 -c main.c -o main.o
    echo "\$ gcc -O2 -c greet.c -o greet.o"
    gcc -O2 -c greet.c -o greet.o
    echo "\$ nm main.o greet.o"
    nm main.o greet.o
    echo "\$ objdump -dr main.o"
    objdump -dr main.o | sed -n '/<main>:/,$p'
} > "$RES/p04-compile.txt"

{
    echo "\$ gcc main.o -o prog"
    gcc main.o -o prog 2>&1 || echo "exit status $?"
    echo "\$ gcc main.o greet.o -o prog && ./prog"
    gcc main.o greet.o -o prog
    ./prog
    echo "\$ gcc -v main.o greet.o -o prog 2>&1 | grep -E '^ .*collect2 ' | tr ' ' '\n' | grep -E 'collect2\$|dynamic-linker|ld-linux|^-pie\$|\.o\$|^-lc\$'"
    gcc -v main.o greet.o -o prog 2>&1 | grep -E '^ .*collect2 ' | tr ' ' '\n' | grep -E 'collect2$|dynamic-linker|ld-linux|^-pie$|\.o$|^-lc$'
    echo "\$ gcc -O2 -c nodecl.c -o nodecl.o"
    gcc -O2 -c nodecl.c -o nodecl.o 2>&1 || echo "exit status $?"
} > "$RES/p04-link.txt"

{
    echo "\$ ar rcs libgreet.a greet.o"
    ar rcs libgreet.a greet.o
    echo "\$ gcc -L. -lgreet main.o -o prog -Wl,-y,greet"
    gcc -L. -lgreet main.o -o prog -Wl,-y,greet 2>&1 || echo "exit status $?"
    echo "\$ gcc main.o -L. -lgreet -o prog -Wl,-y,greet"
    gcc main.o -L. -lgreet -o prog -Wl,-y,greet 2>&1
    echo "\$ ./prog"
    ./prog
    echo "\$ ld.lld --version"
    ld.lld --version
    echo "\$ gcc -fuse-ld=lld -L. -lgreet main.o -o prog_lld && ./prog_lld"
    gcc -fuse-ld=lld -L. -lgreet main.o -o prog_lld
    ./prog_lld
} > "$RES/p04-library-order.txt"

{
    echo "\$ gcc -O2 -Wall -c greet_int.c -o greet_int.o"
    gcc -O2 -Wall -c greet_int.c -o greet_int.o
    echo "\$ nm greet_int.o"
    nm greet_int.o
    echo "\$ gcc main.o greet_int.o -o prog_wrong && ./prog_wrong && ./prog_wrong"
    gcc main.o greet_int.o -o prog_wrong
    ./prog_wrong
    ./prog_wrong
} > "$RES/p04-wrong-type.txt"

{
    echo "\$ rustc --edition 2024 -O --emit obj missing.rs -o missing.o"
    $RUSTC --edition 2024 -O --emit obj missing.rs -o missing.o
    echo "\$ nm -C missing.o"
    nm -C missing.o
    echo "\$ rustc --edition 2024 -O missing.rs -o missing"
    status=0
    $RUSTC --edition 2024 -O missing.rs -o missing > rustc_out.txt 2>&1 || status=$?
    sed "s|$B|DIR|g" rustc_out.txt
    echo "exit status $status"
    echo "\$ rustc --edition 2024 -O missing.rs -L . -l static=greet -o missing && ./missing"
    $RUSTC --edition 2024 -O missing.rs -L . -l static=greet -o missing
    ./missing
} > "$RES/p04-rust.txt"
