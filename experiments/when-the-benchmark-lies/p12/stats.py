import random
import statistics
import sys

def load(path):
    return [float(line.split()[0]) for line in open(path) if line.strip()]


times = load(sys.argv[1])
n = len(times)


def bootstrap_median(sample, resamples=10_000, seed=1):
    rng = random.Random(seed)
    medians = sorted(statistics.median(rng.choices(sample, k=len(sample))) for _ in range(resamples))
    return medians[int(0.025 * resamples)], medians[int(0.975 * resamples) - 1]


print(f"{n} runs, one sort of 1,000,000 u32 values each, in ms")
print(f"  min {min(times):.3f}  median {statistics.median(times):.3f}  mean {statistics.mean(times):.3f}  "
      f"max {max(times):.3f}  standard deviation {statistics.stdev(times):.3f}")

width = 0.5
low = int(min(times) / width) * width
print(f"histogram, bins of {width} ms:")
bins = {}
for t in times:
    b = int((t - low) / width)
    bins[b] = bins.get(b, 0) + 1
for b in range(max(bins) + 1):
    print(f"  {low + b * width:7.2f} - {low + (b + 1) * width:7.2f}  {bins.get(b, 0):3d}  {'#' * bins.get(b, 0)}")

print("the runs in order, median of each group of 10:")
print("  " + " ".join(f"{statistics.median(times[i:i + 10]):.2f}" for i in range(0, n, 10)))

print("95% bootstrap interval of the median (10,000 resamples), using the first k runs:")
for k in (5, 10, 30, 100):
    if k > n:
        continue
    lo, hi = bootstrap_median(times[:k])
    print(f"  k={k:3d}  median {statistics.median(times[:k]):.3f}  interval {lo:.3f} to {hi:.3f}  "
          f"width {hi - lo:.3f} ms ({100 * (hi - lo) / statistics.median(times[:k]):.1f}%)")

print("the same, using k runs taken from other places of the series:")
for k in (5, 10, 30):
    for start in (n // 3, 2 * n // 3):
        part = times[start:start + k]
        if len(part) < k:
            continue
        lo, hi = bootstrap_median(part)
        print(f"  runs {start + 1:3d}-{start + k:3d}  median {statistics.median(part):.3f}  interval {lo:.3f} to {hi:.3f}")

if len(sys.argv) > 2:
    print("every set of runs, with its own 95% bootstrap interval of the median:")
    for i, path in enumerate(sys.argv[1:], start=1):
        t = load(path)
        lo, hi = bootstrap_median(t)
        print(f"  set {i}: {len(t)} runs  median {statistics.median(t):.3f}  interval {lo:.3f} to {hi:.3f}  "
              f"mean {statistics.mean(t):.3f}  standard deviation {statistics.stdev(t):.3f}")
    print("the clock after each run, and millions of cycles per sort (ms times MHz, divided by 1000):")
    for i, path in enumerate(sys.argv[1:], start=1):
        rows = [line.split() for line in open(path) if line.strip()]
        mhz = [float(r[1]) for r in rows]
        cycles = sorted(float(r[0]) * float(r[1]) / 1000 for r in rows)
        q = lambda p: cycles[round((len(cycles) - 1) * p)]
        print(f"  set {i}: median {statistics.median(mhz):.0f} MHz  cycles: p10 {q(0.1):.1f}  median {q(0.5):.1f}  "
              f"p90 {q(0.9):.1f}  max {cycles[-1]:.1f} million")
