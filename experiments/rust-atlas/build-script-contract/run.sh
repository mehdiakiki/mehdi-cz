#!/usr/bin/env bash
# Reproduces every result in "What a Build Script Can Tell Cargo, and What It Cannot".
# Needs rustup with the 1.99.1 toolchain and its thumbv7em-none-eabi target, plus cc, ar and nm.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
results="$here/results"
scratch=$(mktemp -d)
ws="$scratch/ws"
mkdir -p "$results" "$ws"
tar -C "$here" --exclude=./results -cf - . | tar -C "$ws" -xf -
cd "$ws"

clean_env=(env -u CC -u AR -u RUSTFLAGS -u CARGO_ENCODED_RUSTFLAGS -u CARGO_BUILD_TARGET
  -u CARGO_TARGET_DIR -u CARGO_BUILD_TARGET_DIR -u RUSTC_WRAPPER
  -u GREETING_STYLE -u APP_LABEL -u BUILD_LINE CARGO_TERM_COLOR=never)

# Runs a command with a clean environment plus the NAME=VALUE pairs given first.
with_env() { "${clean_env[@]}" "$@"; }

# Replaces the temporary workspace path with WS, the home directory with ~ and Cargo's 16-digit hashes with HASH.
scrub() {
  sed -E -e "s#$ws#WS#g" -e "s#$HOME#~#g" -e 's#-[0-9a-f]{16}([/. `]|$)#-HASH\1#g' -e 's#metadata=[0-9a-f]{16}#metadata=HASH#g'
}

# Prints the output of a command and its exit status, and never stops the script.
attempt() {
  local status=0
  "$@" > "$scratch/out" 2>&1 || status=$?
  scrub < "$scratch/out"
  echo "exit status: $status"
}

# Prints the cfg, check-cfg, target, link and extern flags of one rustc invocation in a -v log.
flags_of() {
  local line
  line=$(grep -m 1 -E -- "Running \`.* --crate-name $1 " "$2")
  grep -oE -- "--target [^ ]+|--cfg '[^']+'|--cfg [a-z0-9_]+|--check-cfg '[^']+'|-L native=[^ ]+|-l static=[^ ]+|--extern [^ ]+|-C link-arg=[^ ]+" <<< "$line" | tr -d '`' | scrub
}

# Prints the lines of a -v log without the long Running lines.
without_running() { grep -vE '^ +Running `' "$1" | scrub; }

{
  rustc +1.99.1 -vV
  cargo +1.99.1 -V
  cc --version | sed -n 1p
  ar --version | sed -n 1p
  echo "installed target used by host-vs-target.txt:"
  rustup target list --toolchain 1.99.1 --installed | grep -x thumbv7em-none-eabi
} > "$results/toolchain.txt"

{
  echo "== cargo build -p app"
  attempt with_env cargo +1.99.1 build --locked --offline -p app
  with_env cargo +1.99.1 clean --offline -q
  with_env cargo +1.99.1 build --locked --offline -v -p app > "$scratch/app-v.log" 2>&1
  echo
  echo "== rustc flags for answer_sys (lib)"
  flags_of answer_sys "$scratch/app-v.log"
  echo
  echo "== rustc flags for app (bin)"
  flags_of app "$scratch/app-v.log"
  echo
  echo "== cargo run -p app"
  with_env cargo +1.99.1 run --locked --offline -q -p app 2> /dev/null
  echo
  echo "== target/debug/app, started directly"
  with_env target/debug/app
  echo
  echo "== nm target/debug/app | grep link_arg_from"
  nm target/debug/app | grep link_arg_from || true
  echo
  echo "== ar t target/debug/deps/libanswer_sys-HASH.rlib"
  ar t target/debug/deps/libanswer_sys-*.rlib | scrub
} > "$results/contract.txt"

{
  echo "== CC=no-such-cc cargo build -v -p app"
  status=0
  with_env CC=no-such-cc cargo +1.99.1 build --locked --offline -v -p app > "$scratch/cc.log" 2>&1 || status=$?
  without_running "$scratch/cc.log"
  echo "exit status: $status"
} > "$results/cargo-error.txt"

{
  for line in 'cargo::feature=extra' 'cargo:feature=extra' 'cargo::rustc-flags=-C opt-level=3'; do
    echo "== echo-line with BUILD_LINE='$line'"
    attempt with_env BUILD_LINE="$line" cargo +1.99.1 build --locked --offline -p echo-line
    echo
  done
  for line in 'cargo::rustc-cfg=fast' 'cargo:rustc-cfg=fast'; do
    echo "== old-msrv (rust-version = \"1.76\") with BUILD_LINE='$line'"
    attempt with_env BUILD_LINE="$line" cargo +1.99.1 build --locked --offline -p old-msrv
    echo
  done
} > "$results/single-lines.txt"

{
  echo "== cargo build -v -p fake-feature"
  status=0
  with_env cargo +1.99.1 build --locked --offline -v -p fake-feature > "$scratch/fake.log" 2>&1 || status=$?
  without_running "$scratch/fake.log"
  echo "exit status: $status"
  echo
  echo "== rustc flags for fake_feature (lib)"
  flags_of fake_feature "$scratch/fake.log"
  echo
  echo "== cargo build -p fake-feature --features extra"
  attempt with_env cargo +1.99.1 build --locked --offline -p fake-feature --features extra
} > "$results/fake-feature.txt"

{
  for target in "" thumbv7em-none-eabi; do
    status=0
    if [[ -z "$target" ]]; then
      echo "== cargo check -v -p where-it-runs"
      with_env cargo +1.99.1 check --locked --offline -v -p where-it-runs > "$scratch/where.log" 2>&1 || status=$?
    else
      echo "== cargo check -v -p where-it-runs --target $target"
      with_env cargo +1.99.1 check --locked --offline -v -p where-it-runs --target "$target" > "$scratch/where.log" 2>&1 || status=$?
    fi
    grep -E '^warning: where-it-runs' "$scratch/where.log" | scrub
    echo "rustc flags for where_it_runs (lib):"
    flags_of where_it_runs "$scratch/where.log"
    echo "exit status: $status"
    echo
  done
} > "$results/host-vs-target.txt"

{
  printf 'hello\n' > shared/greeting.txt
  for package in undeclared-input declared-input; do
    with_env cargo +1.99.1 build --locked --offline -q -p "$package"
    echo "$package, first build: $(target/debug/$package)"
  done
  echo
  echo "== shared/greeting.txt now says bonjour"
  printf 'bonjour\n' > shared/greeting.txt
  for package in undeclared-input declared-input; do
    with_env cargo +1.99.1 build --locked --offline -v -p "$package" 2>&1 | grep -E '^ +(Fresh|Dirty)' | scrub
    echo "$package prints: $(target/debug/$package)"
  done
  echo
  echo "== GREETING_STYLE=loud"
  for package in undeclared-input declared-input; do
    with_env GREETING_STYLE=loud cargo +1.99.1 build --locked --offline -v -p "$package" 2>&1 | grep -E '^ +(Fresh|Dirty)' | scrub
    echo "$package prints: $(target/debug/$package)"
  done
  echo
  echo "== GREETING_STYLE=loud, after touch undeclared-input/src/main.rs"
  touch undeclared-input/src/main.rs
  with_env GREETING_STYLE=loud cargo +1.99.1 build --locked --offline -v -p undeclared-input 2>&1 | grep -E '^ +(Fresh|Dirty)' | scrub
  echo "undeclared-input prints: $(target/debug/undeclared-input)"
} > "$results/hidden-inputs.txt"

echo "results written to $results"
