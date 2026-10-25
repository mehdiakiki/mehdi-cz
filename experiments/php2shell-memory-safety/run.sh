#!/usr/bin/env bash
set -u
cd "$(dirname "$0")" || exit 1
mkdir -p results

{ gcc --version | head -1; rustc +1.99.1 --version; } > results/versions.txt

gcc -fsanitize=address -g -ffile-prefix-map="$PWD"=. use_after_free.c -o uaf
./uaf > results/c-output.txt 2>&1 || true

rustc +1.99.1 use_after_free.rs -o uaf_rs > results/rust-output.txt 2>&1 || true
