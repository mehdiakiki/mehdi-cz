"""Counts the error codes and the modules not found in compiler outputs.

Usage: python3 -I summarize.py OUTPUT...
"""

import collections
import os
import re
import sys


def main():
    for path in sys.argv[1:]:
        with open(path) as f:
            text = f.read()
        codes = collections.Counter(re.findall(r"error (TS\d+):", text))
        modules = collections.Counter(re.findall(r"Cannot find module '([^']+)'", text))
        print(f"{os.path.basename(path)}: {sum(codes.values())} errors")
        for code, count in sorted(codes.items()):
            print(f"  {count:>3} {code}")
        print("  modules not found:")
        for module, count in modules.most_common():
            print(f"  {count:>3} {module}")


if __name__ == "__main__":
    main()
