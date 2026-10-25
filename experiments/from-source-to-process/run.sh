#!/bin/sh
# Builds and runs the experiments of all parts, or of one part: sh run.sh [part]
# Outputs go to out/results/ unless RESULTS names another directory.
set -eu
cd "$(dirname "$0")"
FIXTURE=$(pwd)
OUT="$FIXTURE/out"
RES="${RESULTS:-$OUT/results}"
case "$RES" in /*) ;; *) RES="$FIXTURE/$RES" ;; esac
RUSTC="${RUSTC:-rustc +1.98.0}"
export FIXTURE OUT RES RUSTC
mkdir -p "$OUT" "$RES"

run_part() {
    dir=$(printf 'p%02d' "$1")
    if [ ! -f "$dir/run.sh" ]; then
        echo "no such part: $1" >&2
        exit 2
    fi
    echo "== part $1"
    mkdir -p "$OUT/$dir"
    (cd "$dir" && B="$OUT/$dir" sh ./run.sh)
}

if [ $# -gt 0 ]; then
    run_part "$1"
else
    n=1
    while [ "$n" -le 20 ]; do
        run_part "$n"
        n=$((n + 1))
    done
fi
