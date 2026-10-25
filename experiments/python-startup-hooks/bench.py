#!/usr/bin/env python3
import os
import statistics
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
EAGER = os.path.join(HERE, "lazy", "app_eager.py")
LAZY = os.path.join(HERE, "lazy", "app_lazy.py")

WARMUP = 5
RUNS = 40


def variants(py):
    return [
        ("eager", [py, EAGER, "--version"]),
        ("lazy-keyword", [py, LAZY, "--version"]),
        ("lazy-all", [py, "-X", "lazy_imports=all", EAGER, "--version"]),
    ]


def once(argv):
    start = time.perf_counter()
    subprocess.run(argv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return (time.perf_counter() - start) * 1000.0


def hide_commands(lines):
    for i, line in enumerate(lines):
        if line.lstrip().startswith("PID") and "COMMAND" in line:
            cut = line.index("COMMAND")
            return lines[:i + 1] + [row[:cut] + "(hidden)" for row in lines[i + 1:]]
    return lines


def snapshot(label):
    print("== machine state %s ==" % label)
    for argv, lines in ((["uptime"], None), (["top", "-bn1"], 15), (["free", "-m"], None)):
        out = subprocess.run(argv, capture_output=True, text=True).stdout.splitlines()
        out = hide_commands(out[:lines] if lines else out)
        print("\n".join(out))
    print("cpu affinity: %s" % sorted(os.sched_getaffinity(0)))
    print()


def main():
    py = sys.argv[1]
    runs = variants(py)
    snapshot("before")
    print("python: %s" % subprocess.run([py, "-VV"], capture_output=True, text=True).stdout.strip())

    for _, argv in runs:
        for _ in range(WARMUP):
            once(argv)

    samples = {label: [] for label, _ in runs}
    for _ in range(RUNS):
        for label, argv in runs:
            samples[label].append(once(argv))

    print("runs per variant: %d, interleaved, after %d warmup runs each, milliseconds" % (RUNS, WARMUP))
    print("%-13s %7s %7s %7s %7s %7s" % ("variant", "median", "q1", "q3", "min", "max"))
    for label, _ in runs:
        s = samples[label]
        q1, _, q3 = statistics.quantiles(s, n=4)
        print("%-13s %7.1f %7.1f %7.1f %7.1f %7.1f"
              % (label, statistics.median(s), q1, q3, min(s), max(s)))

    print()
    print("paired rounds (eager minus the lazy run of the same round):")
    for label in ("lazy-keyword", "lazy-all"):
        gaps = [e - x for e, x in zip(samples["eager"], samples[label])]
        slower = sum(1 for g in gaps if g > 0)
        print("vs %-12s eager slower in %d of %d rounds, smallest gap %.1f ms, median gap %.1f ms"
              % (label, slower, RUNS, min(gaps), statistics.median(gaps)))

    print()
    print("raw samples (ms), in round order:")
    for label, _ in runs:
        print("%s: %s" % (label, " ".join("%.1f" % v for v in samples[label])))
    print()
    snapshot("after")


if __name__ == "__main__":
    main()
