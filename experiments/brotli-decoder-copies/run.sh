#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
out="$here/out"
results="$here/results"
src="$out/src"
lock="${STORY_LOCK:-$HOME/Documents/story-scratch/heavy.lock}"
mkdir -p "$out" "$src" "$results"

heavy() {
  if [ -e "$lock" ]; then
    flock "$lock" sh -c "$1"
  else
    sh -c "$1"
  fi
}

san() {
  sed "s|$HOME|DIR|g"
}

show() {
  printf '$ %s\n' "$1"
  sh -c "$1" 2>&1 || true
}

fetch_sources() {
  for v in 1.2.0 1.2.1; do
    tgz="$src/brotli-$v.tar.gz"
    dir="$src/brotli-$v"
    if [ ! -f "$tgz" ]; then
      curl -fsSL -o "$tgz" "https://github.com/google/brotli/archive/refs/tags/v$v.tar.gz"
    fi
    if [ ! -d "$dir" ]; then
      mkdir -p "$dir"
      tar -xzf "$tgz" -C "$dir" --strip-components=1
    fi
  done
}

build_fingerprint() {
  [ -x "$out/fingerprint" ] || heavy "gcc -O2 -Wall -Wextra -o '$out/fingerprint' '$here/fingerprint.c' -ldl"
}

build_libs() {
  fetch_sources
  for v in 1.2.0 1.2.1; do
    heavy "cmake -S '$src/brotli-$v' -B '$out/build-$v' -DCMAKE_BUILD_TYPE=Release -DBROTLI_DISABLE_TESTS=ON -DBUILD_SHARED_LIBS=ON >/dev/null 2>&1 && cmake --build '$out/build-$v' --target brotlidec brotlicommon -j4 >/dev/null 2>&1"
  done
  build_fingerprint
}

fingerprint() {
  build_libs
  {
    echo "== built from source: Brotli 1.2.0 (before the fix)"
    "$out/fingerprint" "$out/build-1.2.0"
    echo
    echo "== built from source: Brotli 1.2.1 (after the fix)"
    "$out/fingerprint" "$out/build-1.2.1"
    echo
    echo "== system /usr/lib (the library curl links)"
    "$out/fingerprint" /usr/lib
    echo
    echo "== the same question with Python ctypes"
    check='import ctypes; f=ctypes.CDLL("libbrotlidec.so.1").BrotliDecoderErrorString; f.restype=ctypes.c_char_p; print(f(-17))'
    for v in 1.2.0 1.2.1; do
      printf '%s build: %s\n' "$v" "$(LD_LIBRARY_PATH="$out/build-$v" python3 -I -c "$check")"
    done
    printf 'system:      %s\n' "$(python3 -I -c "$check")"
  } 2>&1 | san > "$results/fingerprint.txt"
}

toys() {
  heavy "gcc -g -O1 -fsanitize=address -fno-omit-frame-pointer -o '$out/toy-c' '$here/toy-c/decoder.c'"
  heavy "rustc --edition 2021 -O '$here/toy-rust/main.rs' -o '$out/toy-rust' 2> '$out/rust-build.txt'"
  san < "$out/rust-build.txt" > "$results/rust-must-use.txt"

  ASAN_OPTIONS=detect_leaks=0:abort_on_error=0 "$out/toy-c" >/dev/null 2> "$out/c-asan.raw" || true
  san < "$out/c-asan.raw" > "$results/c-asan.txt"

  {
    echo '$ toy-rust match'
    "$out/toy-rust" match
    echo
    echo '$ toy-rust ignore'
    RUST_BACKTRACE=0 "$out/toy-rust" ignore 2>&1 || true
  } | san > "$results/rust-run.txt"

  tmp="$out/nonexhaustive"
  mkdir -p "$tmp"
  cat > "$tmp/nonexhaustive.rs" <<'RS'
#[must_use]
enum Step {
    Decoded,
    NeedMoreInput,
    Malformed,
}

fn describe(s: Step) -> &'static str {
    match s {
        Step::Decoded => "decoded",
        Step::NeedMoreInput => "need more input",
    }
}

fn main() {
    println!("{}", describe(Step::Decoded));
}
RS
  heavy "rustc --edition 2021 '$tmp/nonexhaustive.rs' -o '$tmp/x' 2> '$tmp/err.txt' || true"
  awk 'BEGIN{keep=1} /^help:/{keep=0; print "..."} keep{print}' "$tmp/err.txt" \
    | sed "s|$tmp|DIR|g" > "$results/rust-nonexhaustive.txt"
}

system_state() {
  mirror=$(sed -n 's/^Server = //p' /etc/pacman.d/mirrorlist | head -n 1)
  {
    show "curl -V | tr ' ' '\n' | grep '^brotli/'"
    show "command -v node"
    show "node --version"
    show "node -p process.versions.brotli"
    show "pacman -Qi brotli | grep -E '^(Version|Build Date)'"
    show "grep -E '^Branch' /etc/pacman-mirrors.conf"
    echo
    echo "brotli in core/x86_64 of each branch on the first configured mirror:"
    for b in stable testing unstable; do
      url=$(printf '%s' "$mirror" | sed "s|/stable/|/$b/|; s|[\$]repo|core|; s|[\$]arch|x86_64|")
      pkg=$(curl -fsSL --max-time 60 "$url/" | grep -oE 'brotli-[0-9][^"<>]*-x86_64\.pkg\.tar\.zst' | sort -u | tr '\n' ' ' | sed 's/ $//')
      printf '  %-9s %s\n' "$b" "$pkg"
    done
    echo
    show "python3 -I -c 'import ctypes; f=ctypes.CDLL(\"libbrotlidec.so.1\").BrotliDecoderErrorString; f.restype=ctypes.c_char_p; print(f(-17))'"
  } | san > "$results/system.txt"
}

ports() {
  dir="$out/ports"
  for v in v1.2.0 v1.2.7; do
    mkdir -p "$dir/go-$v"
    [ -f "$dir/go-$v/decode.go" ] || curl -fsSL -o "$dir/go-$v/decode.go" "https://raw.githubusercontent.com/andybalholm/brotli/$v/decode.go"
  done
  for v in 6.1.1 6.2.0; do
    mkdir -p "$dir/rust-$v"
    [ -f "$dir/rust-$v/crate.tar.gz" ] || curl -fsSL -o "$dir/rust-$v/crate.tar.gz" "https://static.crates.io/crates/brotli-decompressor/brotli-decompressor-$v.crate"
    [ -d "$dir/rust-$v/brotli-decompressor-$v" ] || tar -xzf "$dir/rust-$v/crate.tar.gz" -C "$dir/rust-$v"
  done
  {
    for v in v1.2.0 v1.2.7; do
      echo "== Go github.com/andybalholm/brotli $v, decode.go"
      grep -n -A 1 -E '^func (decodeBlockTypeAndLength|decodeLiteralBlockSwitch)\(' "$dir/go-$v/decode.go" | grep -v -e '^--$' -e 'var max_block_type'
      echo
    done
    for v in 6.1.1 6.2.0; do
      f="$dir/rust-$v/brotli-decompressor-$v/src/decode.rs"
      echo "== Rust brotli-decompressor $v, src/decode.rs"
      grep -n -E '^fn DecodeBlockTypeAndLength|input : &\[u8\]\) -> (bool|BrotliDecoderErrorCode) \{' "$f" | head -n 2
      grep -n -A 1 -F 'BlockSwitchInternal(safe, s, input)' "$f" | grep -v '^--$'
      echo
    done
    echo "== Rust brotli-decompressor 6.2.0, README.md"
    grep -n -F 'CVE-2026-111497' "$dir/rust-6.2.0/brotli-decompressor-6.2.0/README.md"
  } > "$results/ports.txt"
}

inventory() {
  build_fingerprint
  heavy "sh '$here/inventory.sh' '$results'"

  {
    echo "curl:            $(curl -V | tr ' ' '\n' | grep -i '^brotli/')"
    echo
    echo "node copies (process.versions.brotli, zlib BLOCK_SWITCH constant, NEEDED libbrotlidec):"
    for n in /usr/bin/node "$HOME"/.nvm/versions/node/*/bin/node; do
      [ -x "$n" ] || continue
      v=$("$n" -p 'process.versions.brotli' 2>/dev/null || echo '?')
      c=$("$n" -p 'require("zlib").constants.BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH ?? "absent"' 2>/dev/null || echo '?')
      if readelf -d "$n" 2>/dev/null | grep -q 'NEEDED.*libbrotlidec'; then link=yes; else link=no; fi
      label=$(printf '%s' "$n" | sed "s|$HOME|DIR|;s|^/usr/bin/node|/usr/bin/node (distro)|")
      printf '  %-42s brotli=%-6s block_switch=%-7s needs_system_lib=%s\n' "$label" "$v" "$c" "$link"
    done
  } | san > "$results/versions.txt"
}

step="${1:-all}"
case "$step" in
  fingerprint) fingerprint ;;
  toys) toys ;;
  system) system_state ;;
  ports) ports ;;
  inventory) inventory ;;
  all) fingerprint; toys; system_state; ports; inventory ;;
  *) echo "usage: sh run.sh [fingerprint|toys|system|ports|inventory|all]" >&2; exit 2 ;;
esac

echo "results written to $results" | san
