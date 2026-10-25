import subprocess
import sys
from collections import Counter

path = sys.argv[1]
sections = []
for line in subprocess.run(["readelf", "-SW", path], capture_output=True, text=True).stdout.splitlines():
    f = line.replace("[ ", "[").split()
    if len(f) > 5 and f[0].startswith("[") and f[1].startswith(".") and f[2] != "NOBITS":
        sections.append((f[1], int(f[3], 16), int(f[5], 16)))
where = Counter()
for line in subprocess.run(["readelf", "-rW", path], capture_output=True, text=True).stdout.splitlines():
    f = line.split()
    if len(f) > 2 and f[2] == "R_X86_64_RELATIVE":
        off = int(f[0], 16)
        name = next((n for n, a, s in sections if a <= off < a + s), "?")
        where[name] += 1
for name, count in where.most_common():
    print(f"  {name:16} {count:4}")
