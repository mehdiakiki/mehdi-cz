import os
import re
import subprocess
import sys
from collections import Counter

mode, trace, program, match = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3]), sys.argv[4]

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


def label(frame):
    path, sym, off = frame
    if sym:
        return sym.split("+")[0]
    if os.path.abspath(path) == program:
        return resolve(off)
    return None


calls = []
for line in open(trace):
    if line.startswith(" > "):
        m = re.match(r" > (\S+?)\((.*?)\) \[(0x[0-9a-f]+)\]", line)
        if m:
            calls[-1][1].append((m.group(1), m.group(2), int(m.group(3), 16)))
    elif re.match(r"[a-z_0-9]+\(", line):
        calls.append((line.split("(", 1)[0], [], line.rstrip()))

if mode == "stack":
    name, frames, text = next(c for c in calls if match in c[2])
    print(text)
    for frame in frames:
        print(f"  {os.path.basename(frame[0]):24} {label(frame) or '?'}")
    sys.exit(0)

print(f"{'#':>3}  {'system call':17} {'innermost frame in':25} named functions on the stack, innermost first")
made_from = Counter()
for n, (name, frames, text) in enumerate(calls, 1):
    obj = os.path.basename(frames[0][0]) if frames else "?"
    named = []
    for frame in frames:
        lab = label(frame)
        if lab and lab not in named:
            named.append(lab)
        if len(named) == 2:
            break
    print(f"{n:3}  {name:17} {obj:25} {' < '.join(named) if named else '-'}")
    if match in text:
        break
    if n > 1:
        made_from[obj] += 1

print()
print(f"system calls after execve and before the write: {sum(made_from.values())}")
for obj, count in made_from.most_common():
    print(f"  made from {obj}: {count}")
