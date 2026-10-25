#!/usr/bin/env python3
import collections
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
EAGER = os.path.join(HERE, "lazy", "app_eager.py")
LAZY = os.path.join(HERE, "lazy", "app_lazy.py")
LOADED = re.compile(r"^import '([^']+)'")

CASES = [
    ("eager, --version", [EAGER, "--version"]),
    ("lazy keyword, --version", [LAZY, "--version"]),
    ("lazy all, --version", ["-X", "lazy_imports=all", EAGER, "--version"]),
    ("eager, full run", [EAGER]),
    ("lazy keyword, full run", [LAZY]),
]


def stderr_of(py, args):
    return subprocess.run([py, *args], capture_output=True, text=True, check=True).stderr


def initialised(py, args):
    lines = stderr_of(py, ["-v", *args]).splitlines()
    return {m.group(1) for m in map(LOADED.match, lines) if m}


def importtime_names(py, args):
    names = []
    for line in stderr_of(py, ["-X", "importtime", *args]).splitlines():
        if line.startswith("import time:") and "imported package" not in line:
            names.append(line.rsplit("|", 1)[1].strip())
    return names


def main():
    py = sys.argv[1]
    print("python: %s" % subprocess.run([py, "-VV"], capture_output=True, text=True).stdout.strip())
    print()
    print("%-26s %16s %22s" % ("case", "importtime lines", "modules initialised"))
    loaded = {}
    timed = {}
    for label, args in CASES:
        loaded[label] = initialised(py, args)
        timed[label] = importtime_names(py, args)
        print("%-26s %16d %22d" % (label, len(timed[label]), len(loaded[label])))

    eager = "eager, --version"
    print()
    print("importtime lines for names that were never initialised (%s):" % eager)
    misses = collections.Counter(n for n in timed[eager] if n not in loaded[eager])
    for name, count in sorted(misses.items()):
        print("  %s x%d" % (name, count))

    print()
    skipped = sorted(loaded[eager] - loaded["lazy keyword, --version"])
    print("initialised by eager but not by lazy keyword on --version (%d):" % len(skipped))
    print("  " + " ".join(skipped))

    print()
    same = loaded["eager, full run"] == loaded["lazy keyword, full run"]
    print("full run, lazy keyword initialises the same modules as eager: %s" % same)


if __name__ == "__main__":
    main()
