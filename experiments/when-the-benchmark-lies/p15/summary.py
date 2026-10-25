import statistics
import sys

offsets = {}
for line in open(sys.argv[1]):
    name, offset = line.split()
    offsets[name] = int(offset)

for path in sys.argv[2:]:
    rows = [line.split() for line in open(path) if line[:1].isdigit() or line[:2].strip().isdigit()]
    rows = [r for r in rows if len(r) == 5]
    pads = [int(r[0]) for r in rows]
    a = [float(r[1]) for r in rows]
    b = [float(r[2]) for r in rows]
    both = [(x + y) / 2 for x, y in zip(a, b)]
    med = statistics.median(both)
    noise = [abs(y - x) / x for x, y in zip(a, b)]
    slow = [(p, v) for p, v in zip(pads, both) if v > 1.1 * med]
    fastest, slowest = min(zip(both, pads)), max(zip(both, pads))
    print(f"{path.split('/')[-1]}: median of the 64 paddings {med:.4f} ns per element")
    print(f"  copy a against copy b of the same padding: mean difference {100 * statistics.mean(noise):.1f}%, "
          f"max {100 * max(noise):.1f}%")
    print(f"  fastest padding {fastest[1]} ({fastest[0]:.4f}), slowest padding {slowest[1]} ({slowest[0]:.4f}), "
          f"slowest / median {slowest[0] / med:.3f}")
    print("  paddings more than 10% above the median: " +
          (", ".join(f"{p} (loop at offset {offsets[f'a{p}']} of 64, {v:.4f}, {100 * (v / med - 1):+.0f}%)" for p, v in slow) or "none"))
