#!/bin/sh
# Runs every linked rg on the same searches and prints one line per binary.
# Usage: same-program.sh LINKS_DIR CORPUS_DIR
set -eu
links=$1
corpus=$2

digest() {
  sha256sum | cut -c1-16
}

cd "$corpus"
printf '%-16s %-15s %-30s %-30s %-9s %-24s %s\n' linker version "sorted search" "parallel search" "no match" "bad regex" "rg::main in DWARF"
for dir in "$links"/*/; do
  name=$(basename "$dir")
  rg=$dir/rg
  version=$("$rg" --version | head -n 1)

  set +e
  "$rg" --sort path -n -i linker . > "$dir/sorted.out"
  sorted_exit=$?
  "$rg" -n 'fn [a-z_]+\(' . | LC_ALL=C sort > "$dir/parallel.out"
  "$rg" 'zq-no-such-text-qz' . > /dev/null
  nomatch_exit=$?
  "$rg" '(' . > /dev/null 2> "$dir/badregex.err"
  bad_exit=$?
  set -e

  sorted="exit $sorted_exit, $(wc -l < "$dir/sorted.out") lines, $(digest < "$dir/sorted.out")"
  parallel="$(wc -l < "$dir/parallel.out") lines, $(digest < "$dir/parallel.out")"
  bad="exit $bad_exit, $(digest < "$dir/badregex.err")"
  address=$(nm -C "$rg" | awk '$3 == "rg::main" { print $1 }')
  line=$(addr2line -e "$rg" "0x$address" | sed 's|.*/crates/|crates/|')
  printf '%-16s %-15s %-30s %-30s %-9s %-24s %s\n' "$name" "$version" "$sorted" "$parallel" "exit $nomatch_exit" "$bad" "$line"
done
