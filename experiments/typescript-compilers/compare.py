"""Compares the diagnostics that several compilers print with --pretty false.

Usage: python3 -I compare.py REFERENCE_OUTPUT OTHER_OUTPUT...
A diagnostic is its first line (file, position, code, message) plus the
indented lines that follow it.
"""

import os
import re
import sys

HEADER = re.compile(r"^(?P<file>.*)\((?P<line>\d+),(?P<col>\d+)\): error (?P<code>TS\d+): ")


def parse(path):
    diagnostics = []
    with open(path) as f:
        for line in f:
            line = line.rstrip("\n")
            if HEADER.match(line) or line.startswith("error TS"):
                diagnostics.append([line])
            elif diagnostics and line.startswith(" "):
                diagnostics[-1].append(line)
    return ["\n".join(d) for d in diagnostics]


def where(diagnostic):
    m = HEADER.match(diagnostic)
    return f"{os.path.basename(m['file'])}({m['line']},{m['col']}) {m['code']}" if m else diagnostic


def main():
    reference_path, others = sys.argv[1], sys.argv[2:]
    reference = parse(reference_path)
    name = os.path.basename(reference_path)
    print(f"{name}: {len(reference)} errors")
    for path in others:
        other = parse(path)
        same_text = [d for d in other if d in reference]
        missing = [d for d in reference if d not in other]
        extra = [d for d in other if d not in reference]
        same_order = [d for d in other if d in reference] == [d for d in reference if d in other]
        print()
        print(f"{os.path.basename(path)}: {len(other)} errors, {len(same_text)} identical to {name}, "
              f"same order: {'yes' if same_order else 'no'}")
        for d in missing:
            print(f"  only in {name}: {where(d)}")
            print("    " + d.replace("\n", "\n    "))
        for d in extra:
            print(f"  only in {os.path.basename(path)}: {where(d)}")
            print("    " + d.replace("\n", "\n    "))


if __name__ == "__main__":
    main()
