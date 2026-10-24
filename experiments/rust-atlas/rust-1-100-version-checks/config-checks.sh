#!/usr/bin/env bash
# How configuration formats read an unquoted 1.100.
set -u
here=$(cd "$(dirname "$0")" && pwd)
repository=$(cd "$here/../../.." && pwd)
scratch=$(mktemp -d)

printf 'toolchain: 1.100\nquoted: "1.100"\nmatrix: [1.99, 1.100]\n' > "$scratch/versions.yaml"

echo "== YAML (PyYAML)"
python3 -c 'import sys, yaml; print(yaml.safe_load(open(sys.argv[1])))' "$scratch/versions.yaml"

echo "== YAML (js-yaml)"
node -e 'const fs = require("fs"); const yaml = require(process.argv[1]); console.log(yaml.load(fs.readFileSync(process.argv[2], "utf8")))' \
  "$repository/node_modules/js-yaml" "$scratch/versions.yaml"

echo "== Cargo.toml with rust-version = 1.100 (unquoted)"
mkdir -p "$scratch/toml-probe/src"
echo 'fn main() {}' > "$scratch/toml-probe/src/main.rs"
printf '[package]\nname = "toml-probe"\nversion = "0.1.0"\nedition = "2024"\nrust-version = 1.100\n' > "$scratch/toml-probe/Cargo.toml"
cargo +1.99.1 metadata --no-deps --format-version 1 --manifest-path "$scratch/toml-probe/Cargo.toml" 2>&1 >/dev/null | head -1

echo "== rust-toolchain.toml with channel = 1.100 (unquoted)"
mkdir -p "$scratch/toolchain-probe"
printf '[toolchain]\nchannel = 1.100\n' > "$scratch/toolchain-probe/rust-toolchain.toml"
(cd "$scratch/toolchain-probe" && RUSTUP_AUTO_INSTALL=0 rustup show active-toolchain 2>&1 | sed "s#$scratch#<tmp>#g" | head -5)
