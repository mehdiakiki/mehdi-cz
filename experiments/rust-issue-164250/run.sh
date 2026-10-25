#!/bin/sh
# Usage: sh run.sh [all|versions|toolchains|inside|asan|companions|mir|flags|history|history-summary|github]
set -eu

here=$(cd "$(dirname "$0")" && pwd)
self="$here/run.sh"
out="$here/out"
results="$here/results"
mkdir -p "$out/bin" "$out/old" "$out/dl" "$out/toolchains" "$results"
cd "$here"

installed="1.81.0 1.88 1.98.0 stable 1.99.0 1.99.1 beta nightly"
old_versions="1.0.0 1.3.0 1.4.0 1.10.0 1.17.0 1.18.0 1.20.0 1.40.0 1.60.0 1.63.0"
programs="lifetime_bound closure_bound static_bound repro_old repro"
companions="covariance bound_unchecked bound_at_construction bound_with_annotation bound_with_drop_call repro_drop_call"
min_free_kb=4194304

clean() {
  sed -e "s#$here/##g" -e "s#$HOME#DIR#g" "$1" > "$1.tmp"
  mv "$1.tmp" "$1"
}

heavy() {
  if [ -n "${HEAVY_LOCK:-}" ]; then flock "$HEAVY_LOCK" "$@"; else "$@"; fi
}

check_disk() {
  free_kb=$(df -Pk "$out" | awk 'NR == 2 { print $4 }')
  if [ "$free_kb" -lt "$min_free_kb" ]; then
    echo "only $free_kb KiB free, stopping before the next download" >&2
    exit 1
  fi
}

show_stdout() {
  LC_ALL=C sed -n 'l' "$1" | sed 's/^/    stdout: /'
}

run_traced() {
  set +e
  strace -qq -e trace=write -e signal=none -s 80 -o "$out/strace.txt" "$1" > "$2" 2> "$out/stderr.txt"
  status=$?
  set -e
  echo "    stdout to $3, exit status: $status"
  writes=$(grep -c '^write(1,' "$out/strace.txt" || true)
  if [ "$writes" -gt 4 ]; then
    echo "    write calls on stdout: $writes, bytes reported written: $(awk -F'= ' '/^write\(1,/ { s += $NF } END { printf "%.0f", s }' "$out/strace.txt")"
    grep '^write(1,' "$out/strace.txt" | head -n 2 | sed 's/^/    /'
    echo "    ..."
    grep '^write(1,' "$out/strace.txt" | tail -n 2 | sed 's/^/    /'
  else
    grep '^write(1,' "$out/strace.txt" | sed 's/^/    /' || true
  fi
  grep -E 'panicked|failed' "$out/stderr.txt" | sed 's/^/    stderr: /' || true
}

gdb_run() {
  env -i PATH="$PATH" gdb -q -batch -x "$1" "$2" 2>&1 | grep -vE '^$|libthread_db|^\[Inferior|auto-load|^of file|No such file or directory|current language|index cache'
}

step_versions() {
  f="$results/versions.txt"
  {
    for tc in $installed; do echo "$tc: $(rustc +"$tc" --version)"; done
    gcc --version | head -n 1
    gdb --version | head -n 1
    strace -V | head -n 1
    objdump --version | head -n 1
    ldd --version | head -n 1
    uname -sr
  } > "$f"
  clean "$f"
}

step_toolchains() {
  f="$results/toolchains.txt"
  : > "$f"
  for tc in $installed; do
    echo "== $tc: $(rustc +"$tc" --version)" >> "$f"
    for mode in debug release; do
      opt=""
      [ "$mode" = release ] && opt="-O"
      bin="$out/bin/repro-$tc-$mode"
      if rustc +"$tc" --edition 2021 $opt src/repro.rs -o "$bin" 2> "$out/err.txt"; then
        echo "  $mode: accepted" >> "$f"
        run_traced "$bin" "$out/stdout.bin" "a file" >> "$f"
      else
        echo "  $mode: rejected" >> "$f"
        sed 's/^/    /' "$out/err.txt" >> "$f"
      fi
    done
  done
  echo "== the 1.81.0 release build again" >> "$f"
  run_traced "$out/bin/repro-1.81.0-release" /dev/null /dev/null >> "$f"
  clean "$f"
}

step_inside() {
  rustc +1.99.1 --edition 2021 -O src/repro.rs -o "$out/bin/inside-release"
  rustc +1.99.1 --edition 2021 -g src/repro.rs -o "$out/bin/inside-debug"
  f="$results/inside-release.txt"
  {
    echo "== bytes printed by the release build"
    "$out/bin/inside-release" > "$out/printed.bin"
    od -An -tx1 "$out/printed.bin"
    echo "== start of <&&alloc::string::String as core::fmt::Display>::fmt in the same binary"
    addr=$(nm -C "$out/bin/inside-release" | grep ' <&&alloc::string::String as core::fmt::Display>::fmt$' | cut -d' ' -f1)
    objdump -d -C --start-address="0x$addr" --stop-address="$((0x$addr + 32))" "$out/bin/inside-release" | grep -E '^ +[0-9a-f]+:|>:$'
    echo "== that symbol and the next one, sorted by address"
    nm -n -C "$out/bin/inside-release" | grep -A1 ' <&&alloc::string::String as core::fmt::Display>::fmt$'
    echo "== gdb at the start of that function, during println"
    gdb_run gdb/release.gdb "$out/bin/inside-release"
  } > "$f"
  clean "$f"
  f="$results/inside-debug.txt"
  {
    echo "== debug build with -g: $("$out/bin/inside-debug")"
    gdb_run gdb/debug.gdb "$out/bin/inside-debug"
  } > "$f"
  clean "$f"
}

step_asan() {
  bin="$out/bin/repro-asan"
  rustc +nightly --edition 2021 -g -Zsanitizer=address --target x86_64-unknown-linux-gnu src/repro.rs -o "$bin"
  f="$results/asan.txt"
  set +e
  "$bin" > "$out/asan-stdout.txt" 2> "$out/asan-stderr.txt"
  status=$?
  set -e
  {
    echo "== $(rustc +nightly --version), -Zsanitizer=address, exit status $status, stdout bytes: $(wc -c < "$out/asan-stdout.txt")"
    cat "$out/asan-stderr.txt"
    echo "== frames of the report, symbolized with addr2line"
    sed -n '/^READ of size/,/^$/p' "$out/asan-stderr.txt" | grep -E 'repro-asan\+0x[0-9a-f]+\)' |
      sed -E 's/^ +(#[0-9]+) .*\+(0x[0-9a-f]+)\).*/\1 \2/' |
      while read -r frame offset; do
        echo "$frame $(addr2line -f -C -e "$bin" "$offset" | paste -sd ' ' -)"
      done
  } > "$f"
  clean "$f"
}

step_companions() {
  f="$results/companions.txt"
  echo "== $(rustc +1.99.1 --version), flags: --edition 2021 -A unused" > "$f"
  for p in $companions; do
    echo "== src/$p.rs" >> "$f"
    if rustc +1.99.1 --edition 2021 -A unused "src/$p.rs" -o "$out/bin/$p" 2> "$out/err.txt"; then
      echo "accepted, output: $("$out/bin/$p")" >> "$f"
    else
      echo "rejected:" >> "$f"
      cat "$out/err.txt" >> "$f"
    fi
  done
  clean "$f"
}

step_flags() {
  f="$results/flags.txt"
  echo "== $(rustc +nightly --version), src/repro.rs, debug build, --edition 2021" > "$f"
  for flags in "" "-Znext-solver=globally" "-Zpolonius=next" "-Zpolonius" "-Znext-solver=globally -Zpolonius=next"; do
    if rustc +nightly --edition 2021 $flags src/repro.rs -o "$out/bin/flags" 2> "$out/err.txt"; then
      echo "${flags:-no -Z flag}: accepted, prints $("$out/bin/flags")" >> "$f"
    else
      echo "${flags:-no -Z flag}: rejected" >> "$f"
      cat "$out/err.txt" >> "$f"
    fi
  done
  clean "$f"
}

nll_dump() {
  rm -rf "$out/mir-$1"
  mkdir -p "$out/mir-$1"
  rustc +nightly --edition 2021 -A unused -Zdump-mir=main -Zdump-mir-dir="$out/mir-$1" --emit=metadata -o "$out/mir-$1/lib.rmeta" "src/$1.rs" > /dev/null 2>&1 || true
  ls "$out/mir-$1"/*.main.*.nll.0.mir
}

step_mir() {
  f="$results/mir.txt"
  {
    echo "== $(rustc +nightly --version) -Zunpretty=mir src/repro.rs, function main, cut to the lines about l and q"
    rustc +nightly --edition 2021 -Zunpretty=mir src/repro.rs 2> /dev/null > "$out/repro.mir"
    awk '/^fn main\(\)/ { m = 1 } m && /^}/ { exit } m' "$out/repro.mir" > "$out/repro-main.mir"
    grep -E 'debug (l|q|_z) =>|let mut _2: Q' "$out/repro-main.mir"
    awk '/^    bb0: \{/ { p = 1 } /^    bb4: \{/ { p = 0 } p' "$out/repro-main.mir"
    for p in repro repro_drop_call; do
      dump=$(nll_dump "$p")
      echo "== -Zdump-mir=main, borrow checker dump for src/$p.rs: universal regions, constraints from lines 10 to 12, borrows"
      grep -E "^\| '\?[0-9]+ \| (Global|Local)" "$dump"
      grep -E "due to .*src/$p\.rs:1[0-2]:" "$dump"
      grep -E '^\| bw0:' "$dump"
      echo "== inferred values of the regions named above"
      for r in $(grep -E "due to .*src/$p\.rs:1[0-2]:|^\| bw0:" "$dump" | grep -oE "'\?[0-9]+" | sort -u -t'?' -k2 -n); do
        grep -F "| $r | U0 |" "$dump" | sed -E 's/(\{[^}]{40})[^}]+([^}]{12}\})/\1 ...\2/'
      done
    done
  } > "$f"
  clean "$f"
}

fetch() {
  name="$1-$2-x86_64-unknown-linux-gnu.tar.gz"
  check_disk
  curl -sSf --retry 3 --retry-delay 2 --retry-all-errors -o "$out/dl/$name" "https://static.rust-lang.org/dist/$name"
  curl -sSf --retry 3 --retry-delay 2 --retry-all-errors -o "$out/dl/$name.sha256" "https://static.rust-lang.org/dist/$name.sha256"
  expected=$(cut -d' ' -f1 "$out/dl/$name.sha256")
  actual=$(sha256sum "$out/dl/$name" | cut -d' ' -f1)
  if [ "$expected" != "$actual" ]; then
    echo "checksum mismatch for $name" >&2
    exit 1
  fi
}

unpack() {
  name="$1-$2-x86_64-unknown-linux-gnu.tar.gz"
  shift 2
  tar xzf "$out/dl/$name" -C "$dest" --strip-components=2 --wildcards "$@"
  rm -f "$out/dl/$name" "$out/dl/$name.sha256"
}

install_old() {
  dest="$out/toolchains/$1"
  rm -rf "$dest"
  mkdir -p "$dest"
  fetch rustc "$1"
  unpack rustc "$1" '*/rustc/bin/rustc' '*/rustc/lib/*'
  if curl -sfI "https://static.rust-lang.org/dist/rust-std-$1-x86_64-unknown-linux-gnu.tar.gz" > /dev/null; then
    fetch rust-std "$1"
    unpack rust-std "$1" '*/rust-std-x86_64-unknown-linux-gnu/lib/*'
  fi
}

test_programs() {
  tag=$(echo "$1" | tr . _)
  shift
  for p in $programs; do
    bin="$out/old/${p}_$tag"
    if "$@" "src/$p.rs" -o "$bin" > "$out/err.txt" 2>&1 && [ -x "$bin" ]; then
      echo "  $p: accepted"
      set +e
      timeout 10 "$bin" > "$out/stdout.bin" 2> /dev/null
      status=$?
      set -e
      if [ "$status" -gt 128 ]; then
        echo "    exit status: $status, killed by SIG$(kill -l "$status")"
      else
        echo "    exit status: $status"
      fi
      show_stdout "$out/stdout.bin"
      rm -f "$bin"
    else
      echo "  $p: does not compile"
      grep -m 3 -E 'error|note' "$out/err.txt" | sed 's/^ */    /'
    fi
  done
}

history_summary() {
  awk '
    /^== / {
      name = $2
      sub(":", "", name)
      label = $4
      if (name ~ /^[a-z]/ && index(label, name) == 0) label = label " (" name ")"
      date = $6
      sub(/\).*/, "", date)
      n++
      rows[n] = label
      dates[n] = date
      next
    }
    /^  [a-z_]+: / {
      p = $1
      sub(":", "", p)
      result[n, p] = ($2 == "accepted") ? "yes" : "other"
      pending = ($2 == "accepted") ? "" : p
      next
    }
    pending != "" {
      if ($0 ~ /does not live long enough/) result[n, pending] = "no"
      pending = ""
    }
    END {
      format = "%-16s %-11s  %-14s  %-13s  %-12s  %-9s  %s\n"
      printf format, "rustc", "commit date", "lifetime_bound", "closure_bound", "static_bound", "repro_old", "repro"
      for (i = 1; i <= n; i++)
        printf format, rows[i], dates[i], result[i, "lifetime_bound"], result[i, "closure_bound"], result[i, "static_bound"], result[i, "repro_old"], result[i, "repro"]
    }' "$results/history.txt" > "$results/history-summary.txt"
}

step_history_one() {
  dest="$out/toolchains/$1"
  f="$results/history.txt"
  echo "== $1: $(LD_LIBRARY_PATH="$dest/lib" "$dest/bin/rustc" --version), $(du -sm "$dest" | cut -f1) MiB extracted" >> "$f"
  test_programs "$1" env LD_LIBRARY_PATH="$dest/lib" "$dest/bin/rustc" >> "$f"
}

step_history() {
  f="$results/history.txt"
  : > "$f"
  for v in $old_versions; do
    install_old "$v"
    heavy sh "$self" history-one "$v"
    rm -rf "$out/toolchains/$v"
  done
  for tc in $installed; do
    echo "== $tc: $(rustc +"$tc" --version)" >> "$f"
    heavy sh "$self" history-installed "$tc" >> "$f"
  done
  clean "$f"
  history_summary
}

step_github() {
  f="$results/github-state.txt"
  {
    echo "== checked $(date -u +%Y-%m-%dT%H:%MZ)"
    gh issue view 164250 -R rust-lang/rust --json title,state,createdAt,labels --jq '"issue: \(.title) | \(.state) | opened \(.createdAt) | labels: \([.labels[].name] | join(", "))"'
    gh pr view 164277 -R rust-lang/rust --json title,state,createdAt,mergedAt,labels --jq '"fix: \(.title) | \(.state) | opened \(.createdAt) | merged: \(.mergedAt) | labels: \([.labels[].name] | join(", "))"'
    gh issue view 25860 -R rust-lang/rust --json title,state,createdAt --jq '"older issue: \(.title) | \(.state) | opened \(.createdAt)"'
    for q in "is:open label:I-unsound" "is:open label:I-unsound label:P-critical" "is:open label:I-unsound label:P-high" "is:closed label:I-unsound"; do
      n=$(gh api -X GET search/issues -f q="repo:rust-lang/rust is:issue $q" --jq .total_count)
      echo "issues with $q: $n"
    done
  } > "$f"
  clean "$f"
}

step="${1:-all}"
case "$step" in
  all)
    for s in versions toolchains inside asan companions mir flags; do heavy sh "$self" "$s"; done
    sh "$self" history
    ;;
  versions) step_versions ;;
  toolchains) step_toolchains ;;
  inside) step_inside ;;
  asan) step_asan ;;
  companions) step_companions ;;
  mir) step_mir ;;
  flags) step_flags ;;
  history) step_history ;;
  history-one) step_history_one "$2" ;;
  history-installed) test_programs "$2" rustc +"$2" ;;
  history-summary) history_summary ;;
  github) step_github ;;
  *) echo "unknown step: $step" >&2; exit 2 ;;
esac
