#!/bin/sh
# Prints the -fuse-ld options that rustc puts on the link line and the linker named in the output.
# Usage: fuse-ld-order.sh WORK_DIR MOLD_BIN_DIR
set -eu
work=$1
mold_bin=$2
mkdir -p "$work"
printf 'fn main() {\n    println!("hello");\n}\n' > "$work/hello.rs"
cd "$work"
for flags in "" "-C link-arg=-fuse-ld=mold" "-C linker-features=-lld -C link-arg=-fuse-ld=mold"; do
  PATH="$mold_bin:$PATH" rustc +1.99.1 $flags --print link-args -o hello hello.rs > link-args.txt
  made_by=$(readelf -p .comment hello | grep -o -E 'mold [0-9.]+|LLD [0-9.]+' | head -n 1)
  fuse=$(tr ' ' '\n' < link-args.txt | grep -o -E 'fuse-ld=[a-z]+' | paste -sd ' ' -)
  echo "rustc ${flags:-(no flags)}: link line has $fuse; .comment names ${made_by:-no linker}"
done
