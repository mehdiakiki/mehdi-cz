"""Compares the published results of parts 1 and 17 with a new run, and
recomputes a summary line from its raw samples.

Usage: python3 compare.py PUBLISHED_DIR NEW_DIR RAW_DIR
"""

import re
import statistics
import sys

TIMING = re.compile(r"^(?P<label>.+?)\s+total\s+\d+ ns\s+(?P<ns>[\d.]+) ns per call$")
HARNESS = re.compile(r"^(?P<label>\S+)\s+min\s+[\d.]+\s+median\s+(?P<ns>[\d.]+)\s")
SORTED = re.compile(r"^(?P<fn>sum_\w+)\s+(?P<random>[\d.]+) ns\s+(?P<sorted>[\d.]+) ns\s+(?P<ratio>[\d.]+)$")


def sections(path):
    """The lines of a results file, grouped under their "== " headers."""
    groups, header = {}, "start"
    with open(path) as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("== "):
                header = line[3:]
                groups[header] = []
            elif line.startswith("uptime:") or line.startswith("busy CPUs") or line.startswith("cpu"):
                continue
            else:
                groups.setdefault(header, []).append(line)
    return groups


def conditions(name, old_path, new_path):
    """The load averages and the frequency lines at the start and at the end."""
    print(f"== {name}: load average and frequency at the start and at the end")
    for label, path in (("published", old_path), ("new", new_path)):
        with open(path) as f:
            for line in f:
                if line.startswith("uptime:"):
                    print(f"{label:<10} load average {line.split('load average:')[1].strip()}")
                elif re.match(r"^cpu\d+: governor", line):
                    print(f"{label:<10} {line.strip()}")


def assembly(name, old, new):
    print(f"== {name}: assembly, published against new")
    for header in old:
        if ": assembly of " in header:
            same = old[header] == new.get(header)
            print(f"{header:<60} {'identical' if same else 'DIFFERENT'} ({len(old[header])} lines)")


def values(groups, prefix, pattern, field):
    """Label to list of values, one per section whose header starts with prefix."""
    out = {}
    for header, lines in groups.items():
        if header.startswith(prefix):
            for line in lines:
                m = pattern.match(line)
                if m:
                    out.setdefault(m.group("label"), []).append(float(m.group(field)))
    return out


def row(label, old, new, digits):
    fmt = lambda v: " ".join(f"{x:.{digits}f}" for x in v)
    ratio = statistics.median(new) / statistics.median(old) if statistics.median(old) else float("nan")
    print(f"{label:<34} {fmt(old):>26}   {fmt(new):>26}   {ratio:>6.2f}")


def part1(old_path, new_path):
    old, new = sections(old_path), sections(new_path)
    conditions("part 1", old_path, new_path)
    assembly("part 1", old, new)
    print("== part 1: ns per call in three runs, published, new, and the ratio of the medians")
    for language in ("Rust", "C"):
        for pattern, field in ((TIMING, "ns"), (HARNESS, "ns")):
            a = values(old, f"{language} run", pattern, field)
            b = values(new, f"{language} run", pattern, field)
            for label in a:
                digits = 5 if max(a[label]) < 1 else 1
                row(f"{language}, {label}", a[label], b[label], digits)


def part17(old_path, new_path):
    old, new = sections(old_path), sections(new_path)
    conditions("part 17", old_path, new_path)
    assembly("part 17", old, new)
    print("== part 17: ratio random/sorted in three runs, published, new, and the ratio of the medians")
    for level in ("3", "1"):
        a, b = {}, {}
        for groups, out in ((old, a), (new, b)):
            for header, lines in groups.items():
                if header.startswith("run ") and f"opt-level={level}," in header:
                    for line in lines:
                        m = SORTED.match(line)
                        if m:
                            out.setdefault(m.group("fn"), []).append(float(m.group("ratio")))
        for fn in a:
            row(f"opt-level={level}, {fn}", a[fn], b[fn], 2)


def raw(raw_dir):
    """The printed summary of harness_sum next to the same summary computed
    again from the raw samples (the value at index round((n - 1) q))."""
    print(f"== raw samples: {raw_dir}/harness_sum.txt")
    with open(f"{raw_dir}/p01-run.txt") as f:
        printed = [line.rstrip("\n") for line in f if line.startswith("harness_sum")][0]
    with open(f"{raw_dir}/harness_sum.txt") as f:
        samples = sorted(float(line) for line in f if line.strip())
    q = lambda p: samples[round((len(samples) - 1) * p)]
    print(f"printed by the program: {printed}")
    print(
        f"computed from the file: min {samples[0]:.3f}  median {q(0.5):.3f}  p90 {q(0.9):.3f}"
        f"  max {samples[-1]:.3f}  (n={len(samples)})"
    )


def main():
    published, new, raw_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    print(f"# part 20: the published results in {published}/ against a new run in {new}/")
    part1(f"{published}/p01-measured-nothing.txt", f"{new}/p01-measured-nothing.txt")
    part17(f"{published}/p17-sorted-data.txt", f"{new}/p17-sorted-data.txt")
    raw(raw_dir)


main()
