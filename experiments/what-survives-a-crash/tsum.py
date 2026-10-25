"""Summarize the durations that strace -T prints, grouped by syscall and first argument."""

import re
import sys

LINE = re.compile(r"^(?:\d+ +)?(\w+)\(([^,)]*)[^<]*<(\d+\.\d+)>$")


def main(path, names):
    groups = {}
    for line in open(path):
        match = LINE.match(line.strip())
        if not match or match.group(1) not in names:
            continue
        key = f"{match.group(1)}({match.group(2)})"
        groups.setdefault(key, []).append(float(match.group(3)) * 1000)
    print(f"{'call':<16}{'count':>6}{'min ms':>10}{'median ms':>11}{'max ms':>10}{'total ms':>10}")
    for key, times in groups.items():
        times.sort()
        median = times[len(times) // 2]
        print(f"{key:<16}{len(times):>6}{times[0]:>10.3f}{median:>11.3f}{times[-1]:>10.3f}{sum(times):>10.1f}")


if __name__ == "__main__":
    main(sys.argv[1], set(sys.argv[2].split(",")))
