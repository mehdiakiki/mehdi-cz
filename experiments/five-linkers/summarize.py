"""Summarizes timing rows: a header line, then one line per run.

Usage: summarize.py TIMING_ROWS
"""

import statistics
import sys


def load(path):
    with open(path) as f:
        lines = [line.split() for line in f if line.strip()]
    header, rows = lines[0], lines[1:]
    runs = {}
    for row in rows:
        r = dict(zip(header, row))
        if r["round"] != "warmup":
            runs.setdefault(r["variant"], []).append(r)
    return runs


def median(runs, key):
    return statistics.median(float(r[key]) for r in runs)


def table(title, runs, names):
    print(title)
    print(f"{'linker':<17} {'median':>7} {'min-max':>13} {'cpu':>6} {'max rss':>9} {'outputs':>7}")
    for name in names:
        wall = [float(r["wall_cc_s"]) for r in runs[name]]
        print(
            f"{name.split('/')[0]:<17} {statistics.median(wall):>6.3f}s {min(wall):>6.3f}-{max(wall):.3f}s "
            f"{median(runs[name], 'cpu_all_s'):>5.2f}s {median(runs[name], 'rss_all_mib'):>5.0f} MiB "
            f"{len({r['output_sha256'] for r in runs[name]}):>7}"
        )
    reads = [float(r["read_kib"]) for name in names for r in runs[name]]
    print(f"read from storage during these runs: {sum(1 for x in reads if x > 0)} of {len(reads)} runs, at most {max(reads):.0f} KiB")
    print()


def parent_view(runs, names):
    print("what a parent that waits for cc sees, against all processes (medians)")
    print(f"{'linker':<17} {'cpu':>6} {'seen':>6} {'max rss':>9} {'seen':>8} {'wall':>7} {'last exit':>9} {'late':>4}")
    for name in names:
        rs = runs[name]
        print(
            f"{name:<17} {median(rs, 'cpu_all_s'):>5.2f}s {median(rs, 'cpu_cc_s'):>5.2f}s "
            f"{median(rs, 'rss_all_mib'):>5.0f} MiB {median(rs, 'rss_cc_mib'):>4.0f} MiB "
            f"{median(rs, 'wall_cc_s'):>6.3f}s {median(rs, 'wall_all_s'):>8.3f}s "
            f"{max(int(r['late']) for r in rs):>4}"
        )


def order_per_round(runs, names):
    print("rounds in which a linker was faster than the next slower one in the table:")
    walls = {name: {r["round"]: float(r["wall_cc_s"]) for r in runs[name]} for name in names}
    for slower, faster in zip(names, names[1:]):
        rounds = walls[faster].keys() & walls[slower].keys()
        wins = sum(walls[faster][k] < walls[slower][k] for k in rounds)
        print(f"  {faster.split('/')[0]} faster than {slower.split('/')[0]}: {wins} of {len(rounds)}")
    print()


def main():
    runs = load(sys.argv[1])
    default = [name for name in runs if "/" not in name]
    single = [name for name in runs if name.endswith("/1-thread")]
    order = sorted(default, key=lambda n: -median(runs[n], "wall_cc_s"))
    count = len(next(iter(runs.values())))
    print(f"{count} measured runs per variant; 'outputs' is the number of different output files\n")
    table("default threads", runs, order)
    single_order = sorted(single, key=lambda n: -median(runs[n], "wall_cc_s"))
    table("one thread, pinned to CPU 2 (a performance core)", runs, [n + "/1-thread" for n in order if n + "/1-thread" in single])
    parent_view(runs, order)
    print()
    print("default threads,", end=" ")
    order_per_round(runs, order)
    print("one thread,", end=" ")
    order_per_round(runs, single_order)
    print("same output file with one thread as with the default threads:")
    for name in order:
        one = name + "/1-thread"
        if one in runs:
            same = {r["output_sha256"] for r in runs[name]} == {r["output_sha256"] for r in runs[one]}
            print(f"  {name}: {'yes' if same else 'no'}")


if __name__ == "__main__":
    main()
