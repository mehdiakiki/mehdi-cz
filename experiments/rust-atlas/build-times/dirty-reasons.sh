#!/usr/bin/env bash
# Reproduce every rebuild trigger used in the fingerprint article and print the
# trimmed Cargo fingerprint log for each one.
#
#   bash dirty-reasons.sh
#
# The absolute cargo path avoids any shell wrapper that could filter output.
# The workspace is snapshotted before the first step and restored before each
# one, so the steps stay independent.
set -u

CARGO="${CARGO_BIN:-$HOME/.cargo/bin/cargo}"
WS="$(cd "$(dirname "$0")/diag" && pwd)"
SNAP="$(mktemp -d)"
LOG='cargo::core::compiler::fingerprint=info'

python3 "$(dirname "$0")/generate.py" >/dev/null
cd "$WS" || exit 1
rm -rf target
cp -a "$WS/." "$SNAP/"
trap 'rm -rf "$SNAP"' EXIT

trim() {
  sed -E \
    -e 's/^ +[0-9.]+s +INFO //' \
    -e 's/prepare_target\{force=false package_id=([^ ]+) v[^)]*\)[^}]*target="[^"]*"\}/[\1]/' \
    -e "s#$WS#WS#g" \
    -e 's/cargo::core::compiler::fingerprint: //'
}

step() { printf '\n########## %s\n' "$1"; }

# Restore the sources, drop the target dir, then do one clean warm build.
reset_warm() {
  cd / || exit 1
  rm -rf "$WS"
  mkdir -p "$WS"
  cp -a "$SNAP/." "$WS/"
  cd "$WS" || exit 1
  "$CARGO" build --offline >/dev/null 2>&1
}

# Count the crates recompiled by one build, without any log filtering.
count_compiles() {
  env "$@" "$CARGO" build --offline 2>&1 | grep -c '^   Compiling'
}

# 1 -------------------------------------------------------------------------
step "1. source file edited in the leaf crate"
reset_warm
printf '\npub fn extra() -> usize { 7 }\n' >>core-a/src/lib.rs
CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 | grep -E 'dirty:|Compiling' | trim

# 2 -------------------------------------------------------------------------
step "2. RUSTFLAGS changed"
reset_warm
RUSTFLAGS="-C debuginfo=1" CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 |
  grep -E 'err:|dirty:|Compiling' | trim
echo "--- same RUSTFLAGS again:      $(count_compiles RUSTFLAGS="-C debuginfo=1") crates recompiled"
echo "--- switched back to no flags: $(count_compiles RUSTFLAGS=) crates recompiled"

# 3 -------------------------------------------------------------------------
step "3. feature set changed by the command (workspace build, then -p core-a)"
reset_warm
CARGO_LOG=$LOG "$CARGO" build --offline -p core-a 2>&1 |
  grep -E 'err:|dirty:|Compiling' | trim
echo "--- workspace build again:    $(count_compiles X=1) crates recompiled"
echo "--- -p core-a again:          $("$CARGO" build --offline -p core-a 2>&1 | grep -c '^   Compiling') crates recompiled"

# 4 -------------------------------------------------------------------------
step "4. profile changed (dev opt-level 0 -> 1)"
reset_warm
sed -i 's/^debug = false$/debug = false\nopt-level = 1/' Cargo.toml
CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 | grep -E 'err:|dirty:|Compiling' | trim

# 5 -------------------------------------------------------------------------
step "5. environment variable read through option_env! changed"
reset_warm
DIAG_TAG=one "$CARGO" build --offline >/dev/null 2>&1
DIAG_TAG=two CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 |
  grep -E 'err:|dirty:|Compiling' | trim
echo "--- back to DIAG_TAG=one:     $(count_compiles DIAG_TAG=one) crates recompiled"

# 6 -------------------------------------------------------------------------
step "6. build script rerun-if-changed points at a missing file"
reset_warm
rm -f core-b/schema/table.txt
echo "--- first build after deleting schema/table.txt"
CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 | grep -E 'err:|dirty:|Compiling' | trim
echo "--- second build, file still missing"
CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 | grep -E 'err:|dirty:|Compiling' | trim
echo "--- third build, file still missing"
CARGO_LOG=$LOG "$CARGO" build --offline 2>&1 | grep -E 'err:|dirty:|Compiling' | trim

reset_warm
printf '\ndone\n'
