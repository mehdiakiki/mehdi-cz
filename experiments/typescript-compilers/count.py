"""Groups the files of a --listFiles output and counts their lines.

Usage: python3 -I count.py LISTFILES_OUTPUT [OTHER_LISTFILES_OUTPUT...]
The first file is the reference; the others are compared with it by file name.
"""

import os
import sys

CATEGORIES = [
    "site .ts and .tsx",
    "site .d.ts and .d.mts",
    "site .js, .mjs and .cjs",
    "site JSON",
    "next typegen output",
    "contentlayer documents",
    "contentlayer _index.json",
    "other contentlayer files",
    "TypeScript lib files",
    "declarations in node_modules",
]


def category(path):
    name = os.path.basename(path)
    if "/out/npm/" in path:
        return "TypeScript lib files"
    if "/node_modules/" in path:
        return "declarations in node_modules"
    if "/.next/" in path:
        return "next typegen output"
    if "/.contentlayer/" in path:
        if name == "_index.json":
            return "contentlayer _index.json"
        return "contentlayer documents" if name.endswith(".json") else "other contentlayer files"
    if name.endswith((".d.ts", ".d.mts", ".d.cts")):
        return "site .d.ts and .d.mts"
    if name.endswith((".ts", ".tsx", ".mts", ".cts")):
        return "site .ts and .tsx"
    if name.endswith((".js", ".mjs", ".cjs", ".jsx")):
        return "site .js, .mjs and .cjs"
    return "site JSON"


def key(path):
    if "/out/npm/" in path:
        return "lib/" + os.path.basename(path)
    if "/node_modules/" in path:
        return "node_modules/" + path.split("/node_modules/", 1)[1]
    return path.split("/out/subject/", 1)[1]


def read_list(listing):
    with open(listing) as f:
        return [line.strip() for line in f if line.strip().startswith("/")]


def summary(paths):
    rows = {c: [0, 0, 0] for c in CATEGORIES}
    for path in paths:
        with open(path, "rb") as f:
            data = f.read()
        row = rows[category(path)]
        row[0] += 1
        row[1] += data.count(b"\n") + (0 if data.endswith(b"\n") else 1)
        row[2] += len(data)
    return rows


def main():
    listings = sys.argv[1:]
    reference = read_list(listings[0])
    rows = summary(reference)
    print(f"files read by {os.path.basename(listings[0])}")
    print(f"{'group':<30} {'files':>6} {'lines':>9} {'MiB':>7}")
    for name, (files, lines, size) in rows.items():
        print(f"{name:<30} {files:>6} {lines:>9} {size / 2**20:>7.1f}")
    total = [sum(r[i] for r in rows.values()) for i in range(3)]
    print(f"{'total':<30} {total[0]:>6} {total[1]:>9} {total[2] / 2**20:>7.1f}")
    reference_keys = {key(p) for p in reference}
    for listing in listings[1:]:
        keys = {key(p) for p in read_list(listing)}
        extra = sorted(keys - reference_keys)
        missing = sorted(reference_keys - keys)
        print()
        print(f"{os.path.basename(listing)}: {len(keys)} files, "
              f"{len(extra)} not in the reference, {len(missing)} missing from it")
        for k in extra:
            print(f"  + {k}")
        for k in missing:
            print(f"  - {k}")


if __name__ == "__main__":
    main()
