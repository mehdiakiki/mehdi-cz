import random
import statistics
import sys

RESAMPLES = 10_000


def interval(values):
    values = sorted(values)
    return values[int(0.025 * len(values))], values[int(0.975 * len(values)) - 1]


def unpaired(first, second, rng):
    """Bootstrap interval of median(second) / median(first) - 1, resampling each version alone."""
    ratios = [statistics.median(rng.choices(second, k=len(second))) /
              statistics.median(rng.choices(first, k=len(first))) - 1 for _ in range(RESAMPLES)]
    return interval(ratios)


def paired(pairs, rng):
    """Bootstrap interval of the median of second / first - 1 over the pairs, resampling whole pairs."""
    diffs = [b / a - 1 for a, b in pairs]
    medians = [statistics.median(rng.choices(diffs, k=len(diffs))) for _ in range(RESAMPLES)]
    return statistics.median(diffs), interval(medians)


print(f"{'experiment':<34} {'first':>8} {'second':>8} {'difference':>11}   95% interval      verdict")
for path in sys.argv[1:]:
    rng = random.Random(1)
    rows = [line.split() for line in open(path) if line.strip()]
    labels = list(dict.fromkeys(r[0] for r in rows))
    first = [float(r[1]) for r in rows if r[0] == labels[0]]
    second = [float(r[1]) for r in rows if r[0] == labels[1]]
    name = path.split("/")[-1].removesuffix(".txt").removeprefix("p13-")
    m1, m2 = statistics.median(first), statistics.median(second)
    if "interleaved" in name:
        diff, (lo, hi) = paired(list(zip(first, second)), rng)
    else:
        diff = m2 / m1 - 1
        lo, hi = unpaired(first, second, rng)
    verdict = "no difference" if lo <= 0 <= hi else ("second is slower" if lo > 0 else "second is faster")
    print(f"{name:<34} {m1:8.3f} {m2:8.3f} {100 * diff:+10.1f}%   {100 * lo:+6.1f}% to {100 * hi:+5.1f}%   {verdict}")
