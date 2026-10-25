#!/usr/bin/env bash
# Reproduces every result in "How Rust 1.99.0 Returned 16 for false".
# Needs x86_64 Linux, rustup with the 1.98.0, 1.99.0 and 1.99.1 toolchains, gcc, clang and GNU objdump.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
results="$here/results"
work=$(mktemp -d)
manifest="$here/Cargo.toml"
toolchains=(1.98.0 1.99.0 1.99.1)
profiles=(debug release)
compilers=(gcc clang)
levels=(-O0 -O1 -O2)
mkdir -p "$results"

cargo_profile() { if [[ $1 == debug ]]; then echo dev; else echo release; fi; }

library() { echo "$work/$1/$2/libboolffi.a"; }

disasm() {
  objdump -d --no-show-raw-insn --disassemble="$2" "$1" |
    awk -v start="<$2>:" '$2 == start {p = 1} p && NF == 0 {p = 0} p'
}

for toolchain in "${toolchains[@]}"; do
  for profile in "${profiles[@]}"; do
    cargo "+$toolchain" build --quiet --locked --manifest-path "$manifest" \
      --target-dir "$work/$toolchain" --profile "$(cargo_profile "$profile")"
  done
done

matrix() {
  local program=$1
  for toolchain in "${toolchains[@]}"; do
    for profile in "${profiles[@]}"; do
      for cc in "${compilers[@]}"; do
        for level in "${levels[@]}"; do
          local exe="$work/$program-$toolchain-$profile-$cc$level"
          "$cc" "$level" -o "$exe" "$here/c/$program.c" "$(library "$toolchain" "$profile")"
          echo "== rust $toolchain $profile, $cc $level"
          "$exe"
        done
      done
    done
  done
}

matrix repro > "$results/repro-matrix.txt"
matrix uses > "$results/c-side.txt"
matrix wrong_prototype > "$results/wrong-prototype.txt"
matrix right_prototype > "$results/right-prototype.txt"
matrix u8_workaround > "$results/u8-workaround.txt"

for symbol in rust_fn_returning_bool rust_fn_returning_bool_u32 rust_fn_returning_u8; do
  for toolchain in "${toolchains[@]}"; do
    for profile in "${profiles[@]}"; do
      echo "== rust $toolchain $profile"
      disasm "$(library "$toolchain" "$profile")" "$symbol"
    done
  done > "$results/asm-$symbol.txt"
done

for toolchain in "${toolchains[@]}"; do
  for profile in "${profiles[@]}"; do
    cargo "+$toolchain" rustc --quiet --locked --manifest-path "$manifest" --lib \
      --target-dir "$work/ir-$toolchain" --profile "$(cargo_profile "$profile")" -- --emit=llvm-ir,link
    echo "== rust $toolchain $profile"
    awk '/^define / {p = 1} p {print} /^}/ {p = 0}' "$work/ir-$toolchain/$profile"/deps/boolffi-*.ll
  done
done > "$results/llvm-ir.txt"

for level in "${levels[@]}"; do
  echo "== clang $level"
  clang "$level" -S -emit-llvm -o - "$here/c/uses.c" | grep '^declare .*@rust_fn_returning_bool('
done > "$results/clang-caller-ir.txt"

for cc in "${compilers[@]}"; do
  for level in "${levels[@]}"; do
    object="$work/uses-$cc$level.o"
    "$cc" "$level" -c -o "$object" "$here/c/uses.c"
    for symbol in if_ret if_not_ret if_ret_equals_true as_int negated double_negated masked; do
      echo "== $cc $level $symbol"
      disasm "$object" "$symbol"
    done
  done
done > "$results/c-caller-asm.txt"

for toolchain in "${toolchains[@]}"; do
  rustc "+$toolchain" --edition 2024 --crate-type lib --crate-name boolffi -C opt-level=3 \
    --emit=obj -o "$work/boolffi-$toolchain.o" "$here/src/lib.rs"
done

for caller in "${toolchains[@]}"; do
  for opt in 0 3; do
    for callee in "${toolchains[@]}"; do
      exe="$work/rust-caller-$caller-$opt-$callee"
      rustc "+$caller" --edition 2024 -C opt-level="$opt" -C link-arg="$work/boolffi-$callee.o" \
        -o "$exe" "$here/rust-caller/main.rs"
      echo "== caller rust $caller opt-level=$opt, function compiled by rust $callee"
      "$exe"
    done
  done
done > "$results/rust-caller.txt"

for caller in "${toolchains[@]}"; do
  rustc "+$caller" --edition 2024 -C opt-level=3 --emit=llvm-ir \
    -o "$work/rust-caller-$caller.ll" "$here/rust-caller/main.rs"
  echo "== caller rust $caller opt-level=3"
  grep '^declare .*@rust_fn_returning_bool(' "$work/rust-caller-$caller.ll"
done > "$results/rust-caller-ir.txt"

for caller in "${toolchains[@]}"; do
  rustc "+$caller" --edition 2024 -C opt-level=3 --emit=asm \
    -o "$work/rust-caller-$caller.s" "$here/rust-caller/main.rs"
  echo "== caller rust $caller opt-level=3"
  awk '/rust_fn_returning_bool@GOTPCREL/ {reg = $NF; print; next}
    reg != "" && $1 == "callq" && $2 == "*" reg {print; getline; print}' "$work/rust-caller-$caller.s"
done > "$results/rust-caller-asm.txt"

{
  for toolchain in "${toolchains[@]}"; do
    rustc "+$toolchain" -vV
    cargo "+$toolchain" -V
  done
  gcc --version | head -n1
  clang --version | head -n1
  objdump --version | head -n1
  uname -m
} > "$results/versions.txt"

echo "results written to $results"
