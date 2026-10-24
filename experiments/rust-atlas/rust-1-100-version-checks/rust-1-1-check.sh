#!/usr/bin/env bash
# What a CI job gets when YAML turns 1.100 into 1.1 and passes it to rustup.
# Downloads Rust 1.1.0 (2015) into a throwaway rustup home, or reuses the home given as $1.
set -u
home=${1:-$(mktemp -d)}
export RUSTUP_HOME="$home/rustup" CARGO_HOME="$home/cargo" RUSTUP_AUTO_INSTALL=0

rustup toolchain install 1.1 --profile minimal --no-self-update 2>&1 | grep -o -E '1\.1\.0-[a-z0-9_-]+ (installed|unchanged).*'
rustup run 1.1 rustc --version
rustup run 1.1 cargo --version

project="$home/modern"
mkdir -p "$project/src"
printf '[package]\nname = "modern"\nversion = "0.1.0"\nedition = "2024"\n' > "$project/Cargo.toml"
printf 'fn main() {\n    let name = "1.100";\n    println!("{name}");\n}\n' > "$project/src/main.rs"
echo "== cargo build of a small 2024-edition crate"
(cd "$project" && rustup run 1.1 cargo build 2>&1 | grep -E 'unused manifest key|error: there is no argument' | sed -E 's/^<std macros>:[0-9:]+ [0-9:]+ //')
