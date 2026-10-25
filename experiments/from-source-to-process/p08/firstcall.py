import os
import statistics
import subprocess
import sys

runs = int(sys.argv[1])
specs = []
for spec in sys.argv[2:]:
    env = dict(os.environ)
    words = spec.split()
    if "=" in words[0]:
        key, value = words[0].split("=")
        env[key] = value
    specs.append((spec, words[-1], env, [], []))

for _ in range(runs):
    for label, prog, env, first, second in specs:
        out = subprocess.run(["taskset", "-c", "2", prog], env=env, capture_output=True, text=True).stdout.split()
        first.append(int(out[0]))
        second.append(int(out[1]))

print(f"{'program':34} {'runs':>4} {'first call, cycles':>28} {'second call, cycles':>22}")
for label, prog, env, first, second in specs:
    first.sort()
    print(f"{label:34} {runs:4}   median {statistics.median(first):6.0f} (p10 {first[runs // 10]:5}, p90 {first[runs * 9 // 10]:5})"
          f"   median {statistics.median(second):4.0f}")
