"""Compare the map printed by kv dump on stdin with the map in a reference dump file."""

import sys


def read_map(lines):
    return dict(line.rstrip("\n").split("=", 1) for line in lines[1:] if "=" in line)


def main(reference):
    expected = read_map(open(reference).readlines())
    got = read_map(sys.stdin.readlines())
    if got == expected:
        print("same map as a recovery without crash")
        return
    changed = sorted(k for k in set(expected) | set(got) if expected.get(k) != got.get(k))
    print("different map: " + ", ".join(f"{k}={got.get(k)} instead of {expected.get(k)}" for k in changed))


if __name__ == "__main__":
    main(sys.argv[1])
