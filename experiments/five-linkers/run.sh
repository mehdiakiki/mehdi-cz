#!/bin/sh
# Builds ripgrep 15.2.0, captures the link command that rustc runs, and links
# the same object files again with seven linker binaries.
# Usage: sh run.sh [fetch|versions|fuse-order|build|time|mold-perf|threads|compare|loop|clean|all]
# Set HEAVY_LOCK to a lock file to run the CPU-heavy steps under flock.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
out=$here/out
results=${RESULTS_DIR:-$here/results}
rounds=${ROUNDS:-20}
toolchain=1.99.1

export CARGO_HOME="$out/cargo-home"
export CARGO_TARGET_DIR="$out/target"
export TMPDIR="$out/tmp"
export GIT_CEILING_DIRECTORIES="$out/src"
export LINKER_TOOLS="$out/tools"
export RUST_SYSROOT="$(rustc +$toolchain --print sysroot)"

src=$out/src/ripgrep-15.2.0
manifest=$src/Cargo.toml

heavy() {
  if [ -n "${HEAVY_LOCK:-}" ]; then
    flock "$HEAVY_LOCK" "$@"
  else
    "$@"
  fi
}

clean_paths() {
  sed -e "s|$out|out|g" -e "s|$here|fixture|g" -e "s|$HOME|DIR|g"
}

machine_state() {
  uptime
  free -m
  top -bn1 | head -n 15 | awk -v me="$(id -un)" 'NR <= 7 { print; next } { if ($2 == me) $2 = "user"; line = $1; for (i = 2; i <= 11; i++) line = line " " $i; print line " -" }'
}

download() {
  url=$1
  sum=$2
  dir=$out/dl/$3
  file=$dir/$(basename "$url")
  mkdir -p "$dir"
  [ -f "$file" ] || curl -fsSL --retry 3 -o "$file" "$url"
  echo "$sum  $file" | sha256sum -c --quiet
}

fetch() {
  download https://github.com/BurntSushi/ripgrep/archive/refs/tags/15.2.0.tar.gz \
    7605249d3eb0d5f170e3414498e3344e26b1e7a147aec518b57090b80036a562 ripgrep
  download https://github.com/rui314/mold/releases/download/v2.42.1/mold-2.42.1-x86_64-linux.tar.gz \
    6ff270c9bf07d2bec5c98aa324eb7c4daf6a1a4d815c05ff1708049616047855 mold-2.42.1
  download https://github.com/rui314/mold/releases/download/v3.0.0/mold-3.0.0-x86_64-linux.tar.gz \
    6c90d4a474c7c0409dfb575be03a5345878ac14fdba18de8b40fa58c60121189 mold-3.0.0
  download https://github.com/wild-linker/wild/releases/download/0.11.0/wild-linker-0.11.0-x86_64-unknown-linux-gnu.tar.gz \
    25012a78de164686f552b7703b5d0223adab4829c79cd1fb351108221d61c7d8 wild-0.11.0
  mkdir -p "$out/src" "$out/tools/wild-ld" "$out/tmp"
  [ -d "$src" ] || tar -xzf "$out/dl/ripgrep/15.2.0.tar.gz" -C "$out/src"
  for t in "$out"/dl/mold-*/*.tar.gz "$out"/dl/wild-*/*.tar.gz; do
    tar -xzf "$t" -C "$out/tools"
  done
  ln -sf ../wild-linker-0.11.0-x86_64-unknown-linux-gnu/wild "$out/tools/wild-ld/ld"
  cargo +$toolchain fetch --locked --manifest-path "$manifest"
}

versions() {
  {
    rustc +$toolchain -vV
    cargo +$toolchain -V
    cc --version | head -n 1
    ld.bfd --version | head -n 1
    ld.gold --version | head -n 1
    ld.lld --version
    "$RUST_SYSROOT/lib/rustlib/x86_64-unknown-linux-gnu/bin/rust-lld" -flavor gnu --version
    "$out/tools/mold-2.42.1-x86_64-linux/bin/mold" --version
    "$out/tools/mold-3.0.0-x86_64-linux/bin/mold" --version
    "$out/tools/wild-linker-0.11.0-x86_64-unknown-linux-gnu/wild" --version
    for f in "$out/tools/mold-2.42.1-x86_64-linux/bin/mold" "$out/tools/mold-3.0.0-x86_64-linux/bin/mold" \
      "$out/tools/wild-linker-0.11.0-x86_64-unknown-linux-gnu/wild"; do
      echo "linker binary size: $(stat -c %s "$f") bytes $f"
    done
    echo "fork option of mold 3.0.0 and wild 0.11.0:"
    "$out/tools/mold-3.0.0-x86_64-linux/bin/mold" --help | grep -E -- '--(no-)?fork'
    "$out/tools/wild-linker-0.11.0-x86_64-unknown-linux-gnu/wild" --help | grep -E -- '--(no-)?fork'
    python3 --version
    strace --version | head -n 1
    echo "kernel $(uname -r), $(grep -m 1 'model name' /proc/cpuinfo | sed 's/.*: //'), $(nproc) CPUs"
  } | clean_paths > "$results/versions.txt"
}

fuse_order() {
  sh "$here/fuse-ld-order.sh" "$out/probe" "$out/tools/mold-3.0.0-x86_64-linux/bin" > "$results/fuse-ld-order.txt"
}

build_profile() {
  profile=$1
  export LINK_ARGS_FILE="$out/link-args-$profile.txt"
  heavy cargo +$toolchain rustc --locked --offline --manifest-path "$manifest" --bin rg --profile "$profile" \
    -- -C linker="$here/cc-capture" -C save-temps
  dir=$CARGO_TARGET_DIR/$( [ "$profile" = dev ] && echo debug || echo release )
  sha256sum < "$dir/rg" | cut -d ' ' -f 1 > "$out/cargo-rg-$profile.sha256"
  rm -f "$dir"/deps/rg-*.bc
  rm -rf "$dir/incremental"
  clean_paths < "$LINK_ARGS_FILE" > "$results/link-command-$profile.txt"
}

build() {
  rm -rf "$CARGO_TARGET_DIR"
  build_profile dev
  build_profile release
}

wait_for_quiet() {
  tries=0
  while [ "$tries" -lt 16 ]; do
    if awk '{ exit !($1 < 2.0) }' /proc/loadavg; then
      return 0
    fi
    tries=$((tries + 1))
    sleep 15
  done
  echo "the 1-minute load stayed at 2.0 or more for 4 minutes, measured anyway"
}

time_profile() {
  profile=$1
  file=$results/timing-$profile.txt
  {
    wait_for_quiet
    echo "machine before:"
    machine_state
    echo
    python3 -I "$here/relink.py" time "$out/link-args-$profile.txt" "$out/timed/$profile" "$rounds"
    echo
    echo "machine after:"
    machine_state
  } > "$file"
  sed -n '/^round /,/^$/p' "$file" > "$out/timing-$profile.rows"
  python3 -I "$here/summarize.py" "$out/timing-$profile.rows" > "$results/timing-$profile-summary.txt"
  rm -rf "$out/timed/$profile"
}

mold_pairs() {
  {
    wait_for_quiet
    echo "machine before:"
    machine_state
    echo
    python3 -I "$here/relink.py" pair "$out/link-args-dev.txt" "$out/timed/pairs" "${PAIRS:-40}" mold-2.42.1 mold-3.0.0
    echo
    echo "machine after:"
    machine_state
  } > "$results/mold-2-vs-3-dev.txt"
  rm -rf "$out/timed/pairs"
}

mold_perf() {
  {
    wait_for_quiet
    echo "machine before:"
    machine_state
    echo
    python3 -I "$here/relink.py" perf "$out/link-args-dev.txt" "$out/timed/perf" "${PERF_RUNS:-10}"
    echo
    echo "machine after:"
    machine_state
  } > "$results/mold-perf-dev.txt"
  rm -rf "$out/timed/perf"
}

timed_session() {
  time_profile dev
  time_profile release
  mold_pairs
  mold_perf
}

threads() {
  for profile in dev release; do
    heavy python3 -I "$here/relink.py" threads "$out/link-args-$profile.txt" "$out/links/$profile" \
      > "$results/threads-$profile.txt"
  done
  rm -rf "$out/links"
}

compare_profile() {
  profile=$1
  links=$out/links/$profile
  heavy python3 -I "$here/relink.py" once "$out/link-args-$profile.txt" "$links" > /dev/null
  relinked=$(sha256sum < "$links/rust-lld-23.1.1/rg" | cut -d ' ' -f 1)
  {
    sh "$here/same-program.sh" "$links" "$src"
    echo
    if [ "$relinked" = "$(cat "$out/cargo-rg-$profile.sha256")" ]; then
      echo "rust-lld relink is byte-identical to the rg that cargo built"
    else
      echo "rust-lld relink differs from the rg that cargo built"
    fi
  } > "$results/same-program-$profile.txt"
  {
    echo "== sizes (bytes)"
    set --
    for d in "$links"/*/; do set -- "$@" "$(basename "$d")=$d/rg"; done
    python3 -I "$here/elfsections.py" summary "$@"
    echo
    echo "== loaded sections, in file order"
    python3 -I "$here/elfsections.py" order "$@"
    echo
    echo "== mold 2.42.1 against mold 3.0.0"
    python3 -I "$here/elfsections.py" diff "$links/mold-2.42.1/rg" "$links/mold-3.0.0/rg"
    nm "$links/mold-2.42.1/rg" | awk '{ print $NF }' | sort > "$out/mold2.names"
    nm "$links/mold-3.0.0/rg" | awk '{ print $NF }' | sort > "$out/mold3.names"
    only2=$(comm -23 "$out/mold2.names" "$out/mold3.names" | paste -sd ' ' -)
    only3=$(comm -13 "$out/mold2.names" "$out/mold3.names" | paste -sd ' ' -)
    echo "symbols only in the mold 2.42.1 output: ${only2:-none}"
    echo "symbols only in the mold 3.0.0 output: ${only3:-none}"
    echo
    echo "== LLD 21.1.8 against rust-lld 23.1.1"
    python3 -I "$here/elfsections.py" diff "$links/lld-21.1.8/rg" "$links/rust-lld-23.1.1/rg"
    echo
    echo "== build id and linker name in each output"
    for d in "$links"/*/; do
      name=$(basename "$d")
      id=$(readelf -n "$d/rg" | awk '/Build ID/ { print $3 }')
      note=$(readelf -p .comment "$d/rg" | sed -n 's/^ *\[ *[0-9a-f]*\] *//p' | grep -v '^GCC' | paste -sd '|' -)
      gold=$(readelf -n "$d/rg" | awk '/Version: gold/ { print "; note: " $2 " " $3 }')
      echo "$name: build id $id (${#id} hex digits); .comment: ${note:-none}$gold"
    done
    echo
    echo "== synthetic symbols with a dollar suffix"
    for d in "$links"/*/; do
      counts=$(nm -a "$d/rg" | awk '{ print $NF }' | grep -o -E '[$][a-z]+$' | sort | uniq -c | awk '{ print $1 " " $2 }' | paste -sd ',' -)
      echo "$(basename "$d"): ${counts:-none}"
    done
    echo
    echo "== size of the dollar-suffixed symbols of mold 3.0.0"
    nm -a "$links/mold-3.0.0/rg" | awk '{ print $NF }' | grep -E '[$][a-z]+$' \
      | awk '{ n++; s += length($0) + 1 } END { printf "%d symbols: %d bytes in .symtab (24 each), %d bytes of names with their NUL byte\n", n, n * 24, s }'
    echo "shortest names: $(nm -a "$links/mold-3.0.0/rg" | awk '{ print $NF }' | grep -E '[$]got$' | awk '{ print length($0), $0 }' | sort -n | head -n 3 | cut -d ' ' -f 2 | paste -sd ' ' -)"
    echo
    echo "== merged string sections that are not loaded"
    python3 -I "$here/elfsections.py" merged "$@"
  } | clean_paths > "$results/sections-$profile.txt"
  rm -rf "$links" "$out"/mold2.names "$out"/mold3.names
}

compare() {
  compare_profile dev
  compare_profile release
}

loop_session() {
  {
    wait_for_quiet
    echo "machine before:"
    machine_state
    echo
    python3 -I "$here/rebuild.py" "$manifest" "${LOOP_ROUNDS:-20}"
    echo
    echo "machine after:"
    machine_state
  } > "$results/rebuild-loop.txt"
}

clean() {
  rm -rf "$out"
}

mkdir -p "$results" "$out/tmp"
step=${1:-all}
case $step in
  fetch) fetch ;;
  versions) versions ;;
  fuse-order) fuse_order ;;
  build) build ;;
  time) heavy sh "$here/run.sh" timed-session ;;
  timed-session) timed_session ;;
  mold-perf) heavy sh "$here/run.sh" mold-perf-session ;;
  mold-perf-session) mold_perf ;;
  threads) threads ;;
  compare) compare ;;
  loop) heavy sh "$here/run.sh" loop-session ;;
  loop-session) loop_session ;;
  clean) clean ;;
  all) fetch; versions; fuse_order; build; heavy sh "$here/run.sh" timed-session; threads; compare; heavy sh "$here/run.sh" loop-session ;;
  *) echo "unknown step $step" >&2; exit 2 ;;
esac
