import re
import subprocess
import sys

path, function = sys.argv[1], sys.argv[2]
relocs = {}
for line in subprocess.run(["readelf", "-rW", path], capture_output=True, text=True).stdout.splitlines():
    f = line.split()
    if len(f) >= 4 and f[2].startswith("R_X86_64_"):
        relocs[int(f[0], 16)] = f[2:]


def name(slot):
    r = relocs.get(slot)
    if r is None:
        return f"slot {slot:#x}"
    if r[0] == "R_X86_64_RELATIVE":
        out = subprocess.run(["addr2line", "-f", "-C", "-e", path, "0x" + r[1]], capture_output=True, text=True)
        return out.stdout.split("\n")[0]
    return r[2].split("@")[0]


asm = subprocess.run(["objdump", "-d", "--no-show-raw-insn", "-C", path], capture_output=True, text=True).stdout
body = asm.split(f"<{function}>:\n", 1)[1].split("\n\n", 1)[0]
seen = []
for m in re.finditer(r"call\s+\*0x[0-9a-f]+\(%rip\)\s+# ([0-9a-f]+)", body):
    target = name(int(m.group(1), 16))
    if target not in seen:
        seen.append(target)
for target in seen:
    print(f"  calls {target}")
