import os
import re
import subprocess
import sys

# Reads an "strace -f -k" trace and prints every mprotect(..., PROT_NONE) call
# with the first named functions on its stack, innermost first.
trace, program = sys.argv[1], os.path.abspath(sys.argv[2])

segments = []
for line in subprocess.run(["readelf", "-lW", program], capture_output=True, text=True).stdout.splitlines():
    f = line.split()
    if f and f[0] == "LOAD":
        segments.append((int(f[1], 16), int(f[2], 16), int(f[4], 16)))


def resolve(offset):
    for off, vaddr, size in segments:
        if off <= offset < off + size:
            out = subprocess.run(["addr2line", "-f", "-C", "-e", program, hex(offset - off + vaddr - 1)],
                                 capture_output=True, text=True).stdout.split("\n")[0]
            return None if out == "??" else out
    return None


def label(path, sym, offset):
    if sym:
        return sym.split("+")[0]
    if os.path.abspath(path) == program:
        return resolve(offset)
    return None


calls = []
for line in open(trace):
    if line.startswith(" > "):
        m = re.match(r" > (\S+?)\((.*?)\) \[(0x[0-9a-f]+)\]", line)
        if m and calls:
            calls[-1][2].append((m.group(1), m.group(2), int(m.group(3), 16)))
    else:
        m = re.match(r"(\d+) (.*)", line.rstrip())
        if m:
            calls.append((m.group(1), m.group(2), []))

for pid, text, frames in calls:
    if text.startswith("mprotect(") and "PROT_NONE" in text:
        print(f"{pid} {text}")
        named = []
        for path, sym, offset in frames:
            name = label(path, sym, offset)
            if name and name not in named and name != "__mprotect":
                named.append(name)
            if len(named) == 3:
                break
        print(f"    called from: {' < '.join(named)}")
