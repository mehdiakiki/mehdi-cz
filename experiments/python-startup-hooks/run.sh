#!/bin/sh
# Rebuilds every result in "What Runs Before Your First Line of Python".
# Usage: sh run.sh [step]
# Steps: deps wheels venvs startup where sitecustomize split scan lazy pep829
# With no step, runs them in order. STORY_LOCK names a lock file that the
# heavy steps take with flock. BENCH_CPU is the CPU for the timing runs.
# UV_URL and UV_SHA256 select the uv wheel.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
OUT="$HERE/out"
RES="$HERE/results"
HOOKS="$OUT/hooks"
TOOLS="$OUT/tools"
UV="$TOOLS/uv"
LOG="$OUT/log"
mkdir -p "$OUT" "$RES" "$LOG" "$TOOLS"

UV_URL="${UV_URL:-https://files.pythonhosted.org/packages/3a/ad/3c2a81d66d1839063662e5b6c0002ec31f8ee987dbc5295747627ca6160a/uv-0.13.5-py3-none-manylinux_2_17_x86_64.manylinux2014_x86_64.whl}"
UV_SHA256="${UV_SHA256:-fa8d26e08e34c29c0c4e820cf3181757086d547240b4f4d31ff1d8bd810ca946}"
PY314="${PY314:-/usr/bin/python3.14}"
PY315_SPEC="${PY315_SPEC:-3.15}"
BENCH_CPU="${BENCH_CPU:-2}"

export UV_PYTHON_INSTALL_DIR="$OUT/python"
export UV_CACHE_DIR="$OUT/uv-cache"

locked() {
  if [ -n "${STORY_LOCK:-}" ]; then flock "$STORY_LOCK" "$@"; else "$@"; fi
}

py315() {
  # Prints the path to the installed Python 3.15 interpreter.
  ls "$OUT"/python/cpython-3.15*/bin/python3.15 2>/dev/null | head -n1
}

scrub() {
  # Replaces machine-specific paths and the user name in a results file.
  sed -i "s#$HERE#DIR#g; s#$HOME#HOME#g; s#\b$(id -un)\b#user#g" "$1"
}

step_deps() {
  if [ ! -x "$UV" ]; then
    mkdir -p "$OUT/downloads"
    whl="$OUT/downloads/uv.whl"
    curl -sSL -o "$whl" "$UV_URL"
    echo "$UV_SHA256  $whl" | sha256sum -c
    unzip -o -j -q "$whl" 'uv-*.data/scripts/uv' -d "$TOOLS"
    chmod +x "$UV"
  fi
  "$UV" --version
  locked "$UV" python install "$PY315_SPEC"
  py315 | sed "s#$HERE#DIR#g"
}

step_wheels() {
  "$PY314" -I "$HERE/make_wheels.py"
  {
    echo "== harmless hook wheel: listing =="
    unzip -l "$HOOKS/startlog-0.0.1-py3-none-any.whl"
    echo
    echo "== its RECORD =="
    unzip -p "$HOOKS/startlog-0.0.1-py3-none-any.whl" startlog-0.0.1.dist-info/RECORD
    echo
    echo "== the .pth file (one line) =="
    unzip -p "$HOOKS/startlog-0.0.1-py3-none-any.whl" startlog.pth
    echo "== the module =="
    unzip -p "$HOOKS/startlog-0.0.1-py3-none-any.whl" startlog.py
  } > "$RES/wheel-listing.txt"
  scrub "$RES/wheel-listing.txt"
}

step_venvs() {
  locked "$UV" venv --clear --seed --python "$PY314" "$OUT/venv314" >/dev/null 2>&1
  locked "$UV" venv --clear --seed --python "$(py315)" "$OUT/venv315" >/dev/null 2>&1
  locked "$UV" pip install --python "$OUT/venv314/bin/python" "$HOOKS/startlog-0.0.1-py3-none-any.whl" >/dev/null
  locked "$UV" pip install --python "$OUT/venv315/bin/python" "$HOOKS/startlog-0.0.1-py3-none-any.whl" >/dev/null
  echo "venv314: $("$OUT/venv314/bin/python" -VV)"
  echo "venv315: $("$OUT/venv315/bin/python" -VV)"
}

step_startup() {
  PY="$OUT/venv314/bin/python"
  callslog="$LOG/calls.log"
  : > "$callslog"
  export STARTLOG_FILE="$callslog"
  echo pass > "$OUT/script.py"
  "$PY" -c pass
  "$PY" -m pip --version >/dev/null
  "$PY" "$OUT/script.py"
  echo '{"a":1}' | "$PY" -m json.tool >/dev/null
  "$PY" -m pip install --quiet --no-index --no-build-isolation "$HOOKS/tinydep-0.0.1-py3-none-any.whl" >/dev/null 2>&1 || true
  unset STARTLOG_FILE

  flaglog="$LOG/flag.log"
  {
    echo "== one line per Python start, for these five commands in this order =="
    echo "python -c pass | python -m pip --version | python script.py | python -m json.tool | python -m pip install tinydep"
    cat "$callslog"
    echo
    echo "== which interpreter flags skip the .pth hook? =="
    for f in "" "-S" "-s" "-E" "-I" "-P"; do
      : > "$flaglog"
      STARTLOG_FILE="$flaglog" "$PY" $f -c pass 2>/dev/null || true
      n=$(wc -l < "$flaglog" | tr -d ' ')
      printf "python %-4s -c pass -> hook ran %s time(s)\n" "$f" "$n"
    done
  } > "$RES/startup-log.txt"
  scrub "$RES/startup-log.txt"
}

step_where() {
  PY="$OUT/venv314/bin/python"
  sidelog="$LOG/side.log"
  {
    echo "== strace: the .pth file is opened at startup =="
    if command -v strace >/dev/null 2>&1; then
      strace -f -e trace=openat "$PY" -c pass 2>&1 | grep "startlog" | head -n3
      for v in venv314 venv315; do
        n=$(strace -f -e trace=openat "$OUT/$v/bin/python" -c pass 2>&1 | grep -c 'startlog\.pth' || true)
        echo "$v: startlog.pth opened $n time(s) for one start"
      done
    else
      echo "(strace not available)"
    fi
    echo
    echo "== a .pth line with a side effect, run once per start? =="
    for v in venv314 venv315; do
      sp=$(ls -d "$OUT/$v"/lib/python3.*/site-packages)
      printf '%s\n' "import os; os.environ.get('STARTLOG_FILE') and open(os.environ['STARTLOG_FILE'], 'a').write('side.pth line ran\\n')" > "$sp/side.pth"
      : > "$sidelog"
      STARTLOG_FILE="$sidelog" "$OUT/$v/bin/python" -c pass
      echo "$v: side.pth line ran $(grep -c '^side.pth line ran' "$sidelog" || true) time(s), startlog module wrote $(grep -c '^pid=' "$sidelog" || true) line(s)"
      rm -f "$sp/side.pth"
    done
    echo
    echo "== python -X importtime -c pass: the module appears =="
    "$PY" -X importtime -c pass 2>&1 | grep -E "cumulative|startlog"
    echo
    echo "== python -v -c pass: site.py processes the .pth and imports it =="
    "$PY" -v -c pass 2>&1 | grep -iE "Processing .pth|import 'startlog'" | head -n3
    echo
    echo "== site.py of Python 3.14, the lines that matter (grep -n) =="
    s=/usr/lib/python3.14/site.py
    if [ -f "$s" ]; then
      grep -n -A2 'line.startswith(("import ", "import\\t"))' "$s"
      grep -n -A9 'sitedir, sitedircase = makepath(sitedir)' "$s"
      grep -n -A1 'Doing this here ensures venv' "$s"
      grep -n 'known_paths = addsitepackages(known_paths)' "$s"
    fi
  } > "$RES/where-it-runs.txt"
  scrub "$RES/where-it-runs.txt"
}

step_sitecustomize() {
  PY="$OUT/venv314/bin/python"
  SP="$OUT/venv314/lib/python3.14/site-packages"
  cat > "$SP/sitecustomize.py" <<'EOF'
import os

path = os.environ.get("STARTLOG_FILE")
if path:
    try:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write("sitecustomize ran\n")
    except OSError:
        pass
EOF
  sclog="$LOG/sc.log"
  {
    echo "== with a sitecustomize.py in site-packages, both it and the .pth run =="
    : > "$sclog"
    STARTLOG_FILE="$sclog" "$PY" -c pass
    cat "$sclog"
    echo
    echo "== which flags skip sitecustomize.py? =="
    for f in "" "-S" "-s" "-E" "-I" "-P"; do
      : > "$sclog"
      STARTLOG_FILE="$sclog" "$PY" $f -c pass 2>/dev/null || true
      n=$(grep -c '^sitecustomize ran' "$sclog" || true)
      printf "python %-4s -c pass -> sitecustomize ran %s time(s)\n" "$f" "$n"
    done
  } > "$RES/sitecustomize.txt"
  rm -f "$SP/sitecustomize.py" "$SP/__pycache__/sitecustomize"*.pyc
  scrub "$RES/sitecustomize.txt"
}

step_split() {
  rm -rf "$OUT/dist" "$OUT/dist-default" "$OUT/dist-fromsdist" "$OUT/splitpkg-default"
  locked "$UV" build --sdist --python "$PY314" --out-dir "$OUT/dist" "$HERE/splitpkg" >/dev/null 2>&1
  locked "$UV" build --wheel --python "$PY314" --out-dir "$OUT/dist" "$HERE/splitpkg" >/dev/null 2>&1
  whl=$(ls "$OUT"/dist/*.whl)
  cp -r "$HERE/splitpkg" "$OUT/splitpkg-default"
  sed -i '/^\[tool.hatch.build.targets.sdist\]/,$d' "$OUT/splitpkg-default/pyproject.toml"
  locked "$UV" build --sdist --python "$PY314" --out-dir "$OUT/dist-default" "$OUT/splitpkg-default" >/dev/null 2>&1
  {
    echo "== the source tree =="
    (cd "$HERE" && find splitpkg -type f | sort)
    echo
    echo "== splitpkg/pyproject.toml: two settings, one per target =="
    grep -A1 -E '^\[tool.hatch.build.targets.(wheel.force-include|sdist)\]' "$HERE/splitpkg/pyproject.toml"
    echo
    echo "== sdist contents (tar tzf) =="
    tar tzf "$OUT/dist/demoproj-0.0.1.tar.gz" | sed 's#demoproj-0.0.1/##' | sort
    echo
    echo "== wheel contents (unzip -Z1) =="
    unzip -Z1 "$whl" | sort
    echo
    echo "== wheel RECORD =="
    unzip -p "$whl" demoproj-0.0.1.dist-info/RECORD
    echo
    echo "== build backend (from the wheel's WHEEL file) =="
    unzip -p "$whl" demoproj-0.0.1.dist-info/WHEEL | grep '^Generator'
    echo
    echo "== without the sdist setting, the sdist also gets extra/ =="
    tar tzf "$OUT/dist-default/demoproj-0.0.1.tar.gz" | sed 's#demoproj-0.0.1/##' | sort
    echo
    echo "== plain uv build (the wheel is built from the sdist) =="
    locked "$UV" build --python "$PY314" --out-dir "$OUT/dist-fromsdist" "$HERE/splitpkg" 2>&1 \
      | grep -E 'Forced include not found|^error' | sed 's#/[^ ]*/sdists-v[0-9]*/[^/]*/#UVCACHE/#' || true
  } > "$RES/wheel-vs-sdist.txt"
  scrub "$RES/wheel-vs-sdist.txt"
}

step_scan() {
  {
    "$PY314" -I "$HERE/scan_pth.py"
    if command -v pacman >/dev/null 2>&1; then
      echo
      echo "== owner of each system .pth file (pacman -Qo) =="
      for f in /usr/lib/python3.14/site-packages/*.pth; do
        [ -e "$f" ] && pacman -Qo "$f"
      done
    fi
  } > "$RES/scan-pth.txt"
  scrub "$RES/scan-pth.txt"
}

step_lazy() {
  PY="$(py315)"
  pin=""
  if command -v taskset >/dev/null 2>&1; then pin="taskset -c $BENCH_CPU"; fi
  "$PY314" -I "$HERE/modules.py" "$PY" > "$RES/lazy-modules.txt"
  locked $pin "$PY314" -I "$HERE/bench.py" "$PY" > "$RES/lazy-timing.txt" 2>&1
  scrub "$RES/lazy-modules.txt"
  scrub "$RES/lazy-timing.txt"
}

step_pep829() {
  VSP="$OUT/venv315/lib/python3.15/site-packages"
  V="$OUT/venv315/bin/python"
  cat > "$VSP/startmark.py" <<'EOF'
import os


def _log(text):
    path = os.environ.get("STARTLOG_FILE")
    if not path:
        return
    try:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(text + "\n")
    except OSError:
        pass


_log("top-level code of startmark.py ran")


def run():
    _log("startmark.run() ran")
EOF
  printf 'startmark:run\n' > "$VSP/startmark.start"
  slog="$LOG/start.log"; : > "$slog"
  {
    echo "== a .start file names an entry point (pkg.mod:callable) =="
    cat "$VSP/startmark.start"
    echo
    echo "== at startup on Python 3.15, the module is imported (top-level code runs), then run() is called =="
    STARTLOG_FILE="$slog" "$V" -c pass
    cat "$slog"
    echo
    echo "== import lines in .pth are now deprecated (message only with -v) =="
    "$V" -v -c pass 2>&1 | grep -iE "startlog.pth are deprecated|Exec'ing from.*startlog" | head -n2
    echo
    echo "== a matching <name>.start suppresses the <name>.pth import line =="
    printf 'startmark:run\n' > "$VSP/startlog.start"
    "$V" -v -c pass 2>&1 | grep -iE "suppressed due to matching" | head -n1
    rm -f "$VSP/startlog.start"
  } > "$RES/pep829-start.txt" 2>&1
  rm -f "$VSP/startmark.start" "$VSP/startmark.py" "$VSP/__pycache__/startmark"*.pyc
  scrub "$RES/pep829-start.txt"
}

all() {
  step_deps
  step_wheels
  step_venvs
  step_startup
  step_where
  step_sitecustomize
  step_split
  step_scan
  step_lazy
  step_pep829
  echo "results written to $RES"
}

if [ "$#" -eq 0 ]; then
  all
else
  "step_$1"
fi
