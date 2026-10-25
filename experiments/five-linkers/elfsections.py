"""Reads the section headers of ELF64 files and compares section contents.

Usage:
  elfsections.py summary NAME=FILE...   sizes per group of sections
  elfsections.py diff FILE_A FILE_B     sections whose bytes or address differ
  elfsections.py order NAME=FILE...     order of the sections that are loaded in memory
  elfsections.py merged NAME=FILE...    string sections that are merged but not loaded
"""

import hashlib
import struct
import sys

SHT_NOBITS = 8
SHF_ALLOC = 2
SHF_MERGE = 0x10


def sections(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:4] != b"\x7fELF" or data[4] != 2 or data[5] != 1:
        sys.exit(f"{path}: not a little-endian ELF64 file")
    (shoff,) = struct.unpack_from("<Q", data, 0x28)
    shentsize, shnum, shstrndx = struct.unpack_from("<HHH", data, 0x3A)
    headers = [struct.unpack_from("<IIQQQQ", data, shoff + i * shentsize) for i in range(shnum)]
    _, _, _, _, names_off, names_size = headers[shstrndx]
    names = data[names_off : names_off + names_size]
    result = []
    for name, kind, flags, addr, offset, size in headers[1:]:
        content = b"" if kind == SHT_NOBITS else data[offset : offset + size]
        result.append(
            {
                "name": names[name : names.index(b"\0", name)].decode(),
                "alloc": bool(flags & SHF_ALLOC),
                "merge": bool(flags & SHF_MERGE),
                "addr": addr,
                "size": size,
                "sha": hashlib.sha256(content).hexdigest()[:12],
            }
        )
    return result, len(data)


def group(section):
    if section["alloc"]:
        return "loaded"
    if section["name"].startswith(".debug"):
        return "debug"
    if section["name"] in (".symtab", ".strtab"):
        return "symbols"
    return "other"


def summary(pairs):
    print(f"{'linker':<16} {'file bytes':>11} {'sections':>8} {'loaded':>10} {'debug':>10} {'symbols':>10} {'other':>6}")
    for pair in pairs:
        label, path = pair.split("=", 1)
        secs, total = sections(path)
        sizes = {"loaded": 0, "debug": 0, "symbols": 0, "other": 0}
        for s in secs:
            sizes[group(s)] += s["size"]
        print(
            f"{label:<16} {total:>11} {len(secs):>8} {sizes['loaded']:>10} {sizes['debug']:>10} "
            f"{sizes['symbols']:>10} {sizes['other']:>6}"
        )


def diff(path_a, path_b):
    a = {s["name"]: s for s in sections(path_a)[0]}
    b = {s["name"]: s for s in sections(path_b)[0]}
    same = 0
    for name in a:
        if name not in b:
            print(f"only in first: {name}")
            continue
        sa, sb = a[name], b[name]
        if (sa["sha"], sa["addr"], sa["size"]) == (sb["sha"], sb["addr"], sb["size"]):
            same += 1
            continue
        print(
            f"differs: {name:<20} size {sa['size']} vs {sb['size']}, "
            f"address {sa['addr']:#x} vs {sb['addr']:#x}, bytes {'same' if sa['sha'] == sb['sha'] else 'different'}"
        )
    for name in b:
        if name not in a:
            print(f"only in second: {name}")
    print(f"identical sections (name, address, size and bytes): {same} of {len(a)}")


def order(pairs):
    for pair in pairs:
        label, path = pair.split("=", 1)
        loaded = [s["name"] for s in sections(path)[0] if s["alloc"]]
        print(f"{label}: {' '.join(loaded)}")


def merged(pairs):
    for pair in pairs:
        label, path = pair.split("=", 1)
        found = [f"{s['name']} {s['size']} bytes" for s in sections(path)[0] if s["merge"] and not s["alloc"]]
        print(f"{label}: {', '.join(found)}")


def main():
    mode = sys.argv[1]
    if mode == "summary":
        summary(sys.argv[2:])
    elif mode == "diff":
        diff(sys.argv[2], sys.argv[3])
    elif mode == "order":
        order(sys.argv[2:])
    elif mode == "merged":
        merged(sys.argv[2:])
    else:
        sys.exit(f"unknown mode {mode}")


if __name__ == "__main__":
    main()
