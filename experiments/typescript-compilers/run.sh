#!/bin/sh
# Type checks a snapshot of this site with tsc 6, TypeScript 7.0, a TypeScript 7.1
# nightly and tsrs, and compares their answers, speed, memory and threads.
# Usage: sh run.sh [install|versions|snapshot|errors|accept|size|answers|buildinfo|timing|threads|faults|syscalls|vmstat|thp|all]
set -eu

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
commit=703cb49
out="$here/out"
results="$here/results"
mkdir -p "$out" "$results"
lock=${HEAVY_LOCK:-$out/heavy.lock}
cd "$here"

heavy() {
  flock "$lock" "$@"
}

clean_paths() {
  modules=$(readlink -f "$repo/node_modules")
  sed -e "s|$modules|node_modules|g" -e "s|$here/||g" -e "s|$HOME|DIR|g" "$@"
}

use_config() {
  cp "$1" "$2/tsconfig.json.new"
  mv "$2/tsconfig.json.new" "$2/tsconfig.json"
}

machine_state() {
  echo "uptime: $(uptime | sed 's/^ *//')"
  free -m
  top -bn1 -w 120 | head -15 | awk '
    NR <= 5 { print; next }
    NR == 7 { print "%CPU %MEM of the busiest processes (names removed):"; next }
    NR > 7 { print "  " $9, $10 }'
}

wait_for_quiet() {
  tries=0
  while [ "$tries" -lt 10 ] && awk '{ exit !($1 > 2.0) }' /proc/loadavg; do
    tries=$((tries + 1))
    sleep 30
  done
}

step_install() {
  for spec in ts6=typescript@6.0.3 ts7=typescript@7.0.2 ts71=typescript@7.1.0-dev.20260930.4 \
    tsrs=tsrs@0.18.0-ts7.1.0-dev.20260929; do
    name=${spec%%=*}
    if [ ! -d "out/npm/$name/node_modules" ]; then
      mkdir -p "out/npm/$name"
      heavy npm install --prefix "out/npm/$name" --ignore-scripts --no-audit --no-fund \
        --cache "$out/npm-cache" "${spec#*=}"
    fi
  done
}

step_versions() {
  {
    echo "cpu: $(lscpu | sed -n 's/^Model name: *//p'), $(nproc) CPUs"
    echo "performance cores: CPUs $(cat /sys/devices/cpu_core/cpus 2>/dev/null || echo unknown)"
    echo "efficiency cores: CPUs $(cat /sys/devices/cpu_atom/cpus 2>/dev/null || echo unknown)"
    echo "kernel: $(uname -sr)"
    echo "node: $(node --version)"
    echo "python: $(python3 --version)"
    echo "site snapshot: commit $commit"
    echo "site's own TypeScript (package.json): $(node -p "require('$repo/node_modules/typescript/package.json').version")"
    for name in ts6 ts7 ts71; do
      echo "$name --version:"
      node "out/npm/$name/node_modules/typescript/bin/tsc" --version
    done
    echo "tsrs --version:"
    node out/npm/tsrs/node_modules/tsrs/bin/tsrs --version
    echo "tsrs allocator (MIMALLOC_VERBOSE=1): mimalloc $(MIMALLOC_VERBOSE=1 \
      out/npm/tsrs/node_modules/@tsrs/linux-x64-gnu/tsrs --version 2>&1 | grep -E '^v[0-9]+\.' | head -n 1)"
    echo
    echo "package sizes on disk:"
    du -sh out/npm/ts6/node_modules/typescript \
      out/npm/ts7/node_modules/typescript out/npm/ts7/node_modules/@typescript/typescript-linux-x64 \
      out/npm/ts71/node_modules/@typescript/typescript-linux-x64 \
      out/npm/tsrs/node_modules/tsrs out/npm/tsrs/node_modules/@tsrs/linux-x64-gnu
    echo
    echo "native binaries (bytes):"
    ls -l out/npm/ts7/node_modules/@typescript/typescript-linux-x64/lib/tsc \
      out/npm/ts71/node_modules/@typescript/typescript-linux-x64/lib/tsc \
      out/npm/tsrs/node_modules/@tsrs/linux-x64-gnu/tsrs | awk '{ print $5, $NF }'
  } | clean_paths > "$results/versions.txt"
}

step_snapshot() {
  if [ -d out/subject ]; then
    echo "out/subject exists, keeping it"
    return
  fi
  mkdir -p out/subject
  git -C "$repo" archive --format=tar "$commit" | tar -x -C out/subject --exclude=experiments
  ln -s "$repo/node_modules" out/subject/node_modules
  cp out/subject/tsconfig.json out/tsconfig.original.json
  (
    cd out/subject
    heavy env NODE_ENV=production INIT_CWD="$PWD" NEXT_TELEMETRY_DISABLED=1 \
      unshare -c -n node_modules/.bin/contentlayer2 build
    heavy env NEXT_TELEMETRY_DISABLED=1 unshare -c -n node_modules/.bin/next typegen
    git -C "$repo" show "$commit:app/tag-data.json" > app/tag-data.json
    mv public/search.json "$out/search.json"
  )
  use_config configs/migrated.json out/subject
}

step_errors() {
  if [ -d out/subject-errors ]; then
    echo "out/subject-errors exists, keeping it"
    return
  fi
  cp -al out/subject out/subject-errors
  use_config configs/migrated.json out/subject-errors
  python3 -I inject-errors.py out/subject-errors > "$results/errors-made.txt"
}

step_accept() {
  {
    for config in original ignore-deprecations paths-only migrated without-generated-json; do
      echo "### config: $config"
      if [ "$config" = original ]; then
        use_config out/tsconfig.original.json out/subject
      else
        use_config "configs/$config.json" out/subject
      fi
      if [ "$config" = paths-only ]; then
        heavy python3 -I bench.py check out/subject/tsconfig.json "accept-$config" tsc6 tsc7 tsc7.1 tsrs \
          | grep '^=='
        echo "first two lines from tsc6:"
        head -n 2 "out/outputs/accept-$config-tsc6.txt"
        for variant in tsc6 tsc7 tsc7.1 tsrs; do
          python3 -I summarize.py "out/outputs/accept-$config-$variant.txt"
        done
      else
        heavy python3 -I bench.py check out/subject/tsconfig.json "accept-$config" tsc6 tsc7 tsc7.1 tsrs
      fi
      echo
    done
  } | clean_paths > "$results/accept.txt"
  use_config configs/migrated.json out/subject
}

step_size() {
  heavy python3 -I bench.py check out/subject/tsconfig.json extended tsc6 tsc7 tsc7.1 tsrs \
    -- --extendedDiagnostics | clean_paths > "$results/extended-diagnostics.txt"
  heavy python3 -I bench.py check out/subject/tsconfig.json listfiles tsc6 tsc7 tsc7.1 tsrs \
    -- --listFiles > /dev/null
  python3 -I count.py out/outputs/listfiles-tsc6.txt out/outputs/listfiles-tsc7.txt \
    out/outputs/listfiles-tsc7.1.txt out/outputs/listfiles-tsrs.txt > "$results/files.txt"
}

step_answers() {
  variants="tsc6 tsc6-stable-order tsc7 tsc7.1 tsrs"
  threads="tsc7-single tsc7-checkers16 tsrs-single tsrs-checkers1 tsrs-checkers16 tsrs-go-order"
  heavy python3 -I bench.py check out/subject-errors/tsconfig.json errors $variants $threads \
    > "$out/answers-check.txt"
  for variant in $variants; do
    clean_paths "out/outputs/errors-$variant.txt" > "$results/diagnostics-$variant.txt"
  done
  for round in 1 2 3 4 5; do
    heavy python3 -I bench.py check out/subject-errors/tsconfig.json "repeat$round" tsc7 tsrs > /dev/null
  done
  {
    echo "### tsc 6 against TypeScript 7.0, the 7.1 nightly and tsrs"
    python3 -I compare.py out/outputs/errors-tsc6.txt out/outputs/errors-tsc7.txt \
      out/outputs/errors-tsc7.1.txt out/outputs/errors-tsrs.txt
    echo
    echo "### tsc 6 with --stableTypeOrdering against TypeScript 7.0"
    python3 -I compare.py out/outputs/errors-tsc6-stable-order.txt out/outputs/errors-tsc7.txt
    echo
    echo "### TypeScript 7.0 against the 7.1 nightly"
    python3 -I compare.py out/outputs/errors-tsc7.txt out/outputs/errors-tsc7.1.txt
    echo
    echo "### the 7.1 nightly against tsrs"
    python3 -I compare.py out/outputs/errors-tsc7.1.txt out/outputs/errors-tsrs.txt
    echo
    echo "### thread settings and five repeated runs"
    for variant in tsc7-single tsc7-checkers16; do
      python3 -I compare.py out/outputs/errors-tsc7.txt "out/outputs/errors-$variant.txt" | tail -n 1
    done
    for variant in tsrs-single tsrs-checkers1 tsrs-checkers16 tsrs-go-order; do
      python3 -I compare.py out/outputs/errors-tsrs.txt "out/outputs/errors-$variant.txt" | tail -n 1
    done
    for round in 1 2 3 4 5; do
      python3 -I compare.py out/outputs/errors-tsc7.txt "out/outputs/repeat$round-tsc7.txt" | tail -n 1
      python3 -I compare.py out/outputs/errors-tsrs.txt "out/outputs/repeat$round-tsrs.txt" | tail -n 1
    done
    echo
    echo "### exit codes"
    grep '^==' "$out/answers-check.txt"
  } | clean_paths > "$results/diagnostics-compare.txt"
}

step_buildinfo() {
  heavy python3 -I bench.py buildinfo out/subject/tsconfig.json tsc6 tsc7 tsc7.1 tsrs \
    > "$results/buildinfo-check.txt"
}

step_timing() {
  (
    flock 9
    {
      wait_for_quiet
      echo "before:"
      machine_state
      echo
      python3 -I bench.py time out/subject/tsconfig.json 11 \
        tsc6 tsc7 tsc7-bin tsc7.1 tsrs tsrs-bin tsrs-checkers4 \
        tsc6+incremental tsc7+incremental tsrs+incremental
      echo
      echo "after:"
      machine_state
    } > "$results/timing.txt"
    {
      wait_for_quiet
      echo "before:"
      machine_state
      echo
      python3 -I bench.py time out/subject/tsconfig.json 11 \
        tsc7-single tsc7-checkers1 tsc7-checkers2 tsc7 tsc7-checkers8 tsc7-checkers16 \
        tsrs-single tsrs-checkers1 tsrs-checkers2 tsrs-checkers4 tsrs-checkers8 tsrs-checkers16 tsrs
      echo
      echo "after:"
      machine_state
    } > "$results/timing-threads.txt"
    {
      wait_for_quiet
      echo "before:"
      machine_state
      echo
      python3 -I bench.py time out/subject/tsconfig.json 15 \
        tsc6 tsc6-pcores tsc7 tsc7-pcores tsc7-ecores \
        tsrs-checkers4 tsrs-checkers4-pcores tsrs-checkers4-ecores \
        tsrs-single tsrs-single-pcores tsrs-single-ecores
      echo
      echo "after:"
      machine_state
    } > "$results/timing-cores.txt"
  ) 9>>"$lock"
}

step_threads() {
  heavy python3 -I bench.py threads out/subject/tsconfig.json \
    tsc6 tsc7 tsc7-single tsc7-checkers16 tsrs tsrs-checkers4 tsrs-single \
    tsrs-single-pcores tsrs-single-ecores > "$results/threads.txt"
}

step_faults() {
  (
    flock 9
    {
      wait_for_quiet
      echo "before:"
      machine_state
      echo
      python3 -I bench.py faults out/subject/tsconfig.json 5 tsc7-single tsc7 tsrs-single tsrs
      echo
      echo "after:"
      machine_state
    } > "$results/faults.txt"
  ) 9>>"$lock"
}

step_syscalls() {
  heavy python3 -I bench.py syscalls out/subject/tsconfig.json tsc7-bin tsrs-bin > "$results/syscalls.txt"
}

thp_variants="tsc7-thp-default tsc7-thp-off tsrs-thp-default tsrs-thp-off tsrs-single-thp-default tsrs-single-thp-off"

step_vmstat() {
  (
    flock 9
    {
      echo "transparent huge pages: $(cat /sys/kernel/mm/transparent_hugepage/enabled)"
      echo "defrag: $(cat /sys/kernel/mm/transparent_hugepage/defrag)"
      echo
      echo "before:"
      machine_state
      echo
      python3 -I bench.py vmstat out/subject/tsconfig.json 5 $thp_variants
      echo
      echo "after:"
      machine_state
    } > "$results/vmstat.txt"
  ) 9>>"$lock"
}

step_thp() {
  (
    flock 9
    {
      wait_for_quiet
      echo "before:"
      machine_state
      echo
      python3 -I bench.py time out/subject/tsconfig.json 11 $thp_variants
      echo
      echo "after:"
      machine_state
    } > "$results/timing-thp.txt"
  ) 9>>"$lock"
}

step_all() {
  step_install
  step_versions
  step_snapshot
  step_errors
  step_accept
  step_size
  step_answers
  step_buildinfo
  step_timing
  step_threads
  step_faults
  step_syscalls
  step_vmstat
  step_thp
}

"step_${1:-all}"
