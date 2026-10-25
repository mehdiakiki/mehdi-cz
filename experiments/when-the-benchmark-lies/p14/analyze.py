import statistics
import sys

rows = [line.split() for line in open(sys.argv[1]) if line.strip()]
passes = sorted({r[0] for r in rows})
for workload in ("copy", "fib"):
    by_pass = {}
    for p, pad, _local, w, us in rows:
        if w == workload:
            by_pass.setdefault(p, {})[int(pad)] = float(us)
    pads = sorted(by_pass[passes[0]])
    dev = {}
    for p in passes:
        med = statistics.median(by_pass[p].values())
        dev[p] = {pad: by_pass[p][pad] / med - 1 for pad in pads}
        values = sorted(by_pass[p].values())
        print(f"{workload}, pass {p}: median {med:.1f} us, min {values[0]:.1f}, max {values[-1]:.1f}, "
              f"pads more than 5% above the median: {sum(1 for d in dev[p].values() if d > 0.05)}")
    for i, a in enumerate(passes):
        for b in passes[i + 1:]:
            r = statistics.correlation([dev[a][x] for x in pads], [dev[b][x] for x in pads])
            print(f"{workload}: correlation of the deviations, pass {a} against pass {b}: {r:+.2f}")
    worst = sorted(pads, key=lambda x: -min(dev[p][x] for p in passes))[:5]
    print(f"{workload}: the 5 pads with the largest deviation in all passes: " +
          ", ".join(f"{x} (" + "/".join(f"{100 * dev[p][x]:+.1f}%" for p in passes) + ")" for x in worst))

print("median deviation from the median of the pass, by region of 256 bytes of padding (0-255, 256-511, ...):")
for workload in ("copy", "fib"):
    for p in passes:
        values = {int(pad): float(us) for q, pad, _local, w, us in rows if q == p and w == workload}
        med = statistics.median(values.values())
        regions = [statistics.median(values[x] / med - 1 for x in range(b, b + 256, 16)) for b in range(0, 4096, 256)]
        print(f"  {workload:<4} pass {p}: " + " ".join(f"{100 * d:+5.1f}" for d in regions))
