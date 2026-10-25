import statistics
import sys

# Each argument is label=path: a label and the output file of one run.
runs = {}
for arg in sys.argv[1:]:
    label, path = arg.split("=")
    table = {}
    for line in open(path):
        parts = line.split()
        if len(parts) == 6 and parts[1] in ("KiB", "MiB"):
            table[f"{parts[0]} {parts[1]}"] = (float(parts[2]), float(parts[3]), int(parts[4]))
    runs.setdefault(label, []).append(table)

sizes = list(next(iter(runs.values()))[0])
labels = list(runs)
print("chase, ns per step: median of the runs [min-max]")
print(f"{'size':>10} " + " ".join(f"{label:>26}" for label in labels))
for size in sizes:
    cells = []
    for label in labels:
        v = sorted(t[size][0] for t in runs[label])
        cells.append(f"{statistics.median(v):>8.2f} [{v[0]:7.2f}-{v[-1]:7.2f}]")
    print(f"{size:>10} " + " ".join(f"{c:>26}" for c in cells))
print("sequential sum, ns per element: median of the runs")
print(f"{'size':>10} " + " ".join(f"{label:>12}" for label in labels))
for size in sizes:
    print(f"{size:>10} " + " ".join(f"{statistics.median(t[size][1] for t in runs[label]):>12.3f}" for label in labels))
print("AnonHugePages of the process at the largest size, kB, per run:")
for label in labels:
    print(f"  {label}: " + ", ".join(str(t[sizes[-1]][2]) for t in runs[label]))
