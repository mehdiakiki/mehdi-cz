#!/usr/bin/env bash
# Reproduces every result in "What Breaks When Rust Reaches 1.100".
# Needs rustup with the 1.99.1 and beta toolchains, Python 3 with PyYAML, and Node.js.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
results="$here/results"
target=$(mktemp -d)
mkdir -p "$results"
cd "$here"

bash text-checks.sh > "$results/text-checks-shell.txt"
python3 text-checks.py > "$results/text-checks-python.txt"
node text-checks.mjs > "$results/text-checks-node.txt"
bash config-checks.sh > "$results/config-checks.txt"

manifest="$here/probe/Cargo.toml"
answers() { grep 'warning: version-probe' | sed 's/^warning: version-probe@0.1.0: //'; }
{
  echo "== real compiler: $(rustc +1.99.1 --version)"
  cargo +1.99.1 build --locked --manifest-path "$manifest" --target-dir "$target/real" 2>&1 | answers
  echo "== stand-in: $("$here/fake-rustc" --version)"
  RUSTC="$here/fake-rustc" cargo +1.99.1 build --locked --manifest-path "$manifest" --target-dir "$target/stand-in" 2>&1 | answers
  echo "== beta stand-in: $("$here/fake-rustc-beta" --version)"
  RUSTC="$here/fake-rustc-beta" cargo +1.99.1 build --locked --manifest-path "$manifest" --target-dir "$target/beta-stand-in" 2>&1 | answers
  echo "== real beta: $(rustc +beta --version)"
  cargo +beta build --locked --manifest-path "$manifest" --target-dir "$target/beta" 2>&1 | answers
} > "$results/crate-checks.txt"

echo "results written to $results"
