#!/usr/bin/env bash
# Builds the Rust variadic functions, calls them from C and Rust, and records
# every output and compiler message in results/.
# Needs rustup with the 1.98.0, 1.99.0, 1.99.1 and nightly toolchains, Miri on
# nightly, gcc and clang.
set -euo pipefail
export LC_ALL=C
here=$(cd "$(dirname "$0")" && pwd)
results="$here/results"
work=$(mktemp -d)
mkdir -p "$results"
cd "$here"

cflags=(-std=c17 -Wall -Wextra -O2 -Ic)

run() {
  local out status=0
  out=$("$@" 2>&1) || status=$?
  if [ -n "$out" ]; then printf '%s\n' "$out"; else echo "(no output)"; fi
  echo "[exit status $status]"
}

build() {
  cargo "+$1" build --release --locked --quiet --target-dir "$work/$1" 2>&1
}

native_libs=$(cargo +1.99.1 rustc --release --locked --quiet --lib --crate-type staticlib \
  --target-dir "$work/native-libs" -- --print native-static-libs 2>&1 |
  sed -n 's/^note: native-static-libs: //p')
read -r -a link_libs <<< "$native_libs"

{
  rustc +1.98.0 --version
  rustc +1.99.0 --version
  rustc +1.99.1 --version
  cargo +1.99.1 --version
  rustc +nightly --version
  cargo +nightly miri --version
  gcc --version | head -n 1
  clang --version | head -n 1
  rustc +1.99.1 -vV | grep '^host:'
  echo "native-static-libs: $native_libs"
} > "$results/versions.txt"

{
  for toolchain in 1.99.1 1.99.0; do
    echo "== cargo +$toolchain build --release"
    run build "$toolchain"
    lib="$work/$toolchain/release/libvarargs.a"
    for cc in gcc clang; do
      echo "== $cc ${cflags[*]} c/caller.c (Rust $toolchain)"
      run "$cc" "${cflags[@]}" c/caller.c "$lib" "${link_libs[@]}" -o "$work/caller-$cc-$toolchain"
    done
  done
} > "$results/build.txt"

for toolchain in 1.99.1 1.99.0; do
  for cc in gcc clang; do
    "$work/caller-$cc-$toolchain" > "$work/caller-$cc-$toolchain.txt"
  done
  "$work/$toolchain/release/rust-caller" > "$work/caller-rust-$toolchain.txt"
done
cp "$work/caller-gcc-1.99.1.txt" "$results/caller-gcc.txt"
cp "$work/caller-clang-1.99.1.txt" "$results/caller-clang.txt"
cp "$work/caller-rust-1.99.1.txt" "$results/caller-rust.txt"

{
  for name in caller-clang-1.99.1 caller-rust-1.99.1 caller-gcc-1.99.0 caller-clang-1.99.0 caller-rust-1.99.0; do
    if cmp -s "$work/caller-gcc-1.99.1.txt" "$work/$name.txt"; then
      echo "$name: same output as caller-gcc-1.99.1"
    else
      echo "$name: different output from caller-gcc-1.99.1"
      diff "$work/caller-gcc-1.99.1.txt" "$work/$name.txt" || true
    fi
  done
} > "$results/caller-compare.txt"

"$work/1.99.1/release/cursor" > "$results/valist-cursor.txt"

{
  for toolchain in 1.98.0 1.99.0 1.99.1; do
    echo "== rustc +$toolchain --edition 2024 announcement/sum.rs"
    run rustc "+$toolchain" --edition 2024 -o "$work/sum-$toolchain" announcement/sum.rs
    if [ -x "$work/sum-$toolchain" ]; then
      echo "== sum built by $toolchain"
      run "$work/sum-$toolchain"
    fi
    echo
  done
} > "$results/announcement-example.txt"

{
  for file in errors/*.rs; do
    echo "== rustc +1.99.1 --edition 2024 --crate-type lib $file"
    run rustc +1.99.1 --edition 2024 --crate-type lib --emit metadata --out-dir "$work/errors" "$file"
    echo
  done
} > "$results/errors-1.99.1.txt"

{
  echo "== rustc +1.99.0 --edition 2024 --crate-type lib errors/va_arg_safe_bound.rs"
  run rustc +1.99.0 --edition 2024 --crate-type lib --emit metadata --out-dir "$work/errors-1.99.0" \
    errors/va_arg_safe_bound.rs
} > "$results/va-arg-safe-1.99.0.txt"

{
  echo "== cargo +1.98.0 build --release"
  run cargo +1.98.0 build --release --locked --quiet --target-dir "$work/1.98.0"
  echo
  echo "== cargo +1.98.0 build --release --ignore-rust-version"
  run cargo +1.98.0 build --release --locked --quiet --ignore-rust-version --target-dir "$work/1.98.0"
} > "$results/older-rust-1.98.0.txt"

lib="$work/1.99.1/release/libvarargs.a"
{
  for cc in gcc clang; do
    echo "== $cc ${cflags[*]} c/misuse.c"
    run "$cc" "${cflags[@]}" c/misuse.c "$lib" "${link_libs[@]}" -o "$work/misuse-$cc"
    echo
    echo "== $cc ${cflags[*]} -DVARARGS_CHECKED c/misuse.c"
    run "$cc" "${cflags[@]}" -DVARARGS_CHECKED c/misuse.c "$lib" "${link_libs[@]}" -o "$work/misuse-$cc-checked"
    echo
  done
  for cc in gcc clang; do
    echo "== $cc ${cflags[*]} c/typed-misuse.c"
    run "$cc" "${cflags[@]}" c/typed-misuse.c "$lib" "${link_libs[@]}" -o "$work/typed-misuse-$cc"
    echo
  done
} > "$results/c-misuse-compile.txt"

{
  for which in wrong-type short-count; do
    for attempt in 1 2 3; do
      echo "== misuse-gcc $which (run $attempt)"
      run "$work/misuse-gcc" "$which"
    done
  done
  echo "== misuse-gcc not-my-format"
  run "$work/misuse-gcc" not-my-format
} > "$results/c-misuse-runs.txt"

{
  for which in wrong-type short-count; do
    for attempt in 1 2 3; do
      echo "== misuse $which (run $attempt)"
      run "$work/1.99.1/release/misuse" "$which"
    done
  done
} > "$results/rust-misuse-runs.txt"

cargo +nightly miri setup > /dev/null 2>&1
{
  for which in wrong-type short-count; do
    echo "== cargo +nightly miri run --bin misuse -- $which"
    run cargo +nightly miri run --quiet --locked --bin misuse --target-dir "$work/miri" -- "$which"
    echo
  done
} > "$results/miri.txt"

echo "results written to $results"
