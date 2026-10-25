import os
import re
import statistics
import subprocess
import sys

runs = int(sys.argv[1])
print(f"{'program':16} {'runs':>4}  {'loader total, cycles':>22}  {'relocation, cycles':>20}")
for program in sys.argv[2:]:
    total, reloc = [], []
    for _ in range(runs):
        err = subprocess.run([program], env=dict(os.environ, LD_DEBUG="statistics"),
                             capture_output=True, text=True).stderr
        total.append(int(re.search(r"total startup time in dynamic loader: (\d+)", err).group(1)))
        reloc.append(int(re.search(r"time needed for relocation: (\d+)", err).group(1)))
    print(f"{os.path.basename(program):16} {runs:4}  median {statistics.median(total):8.0f}"
          f" (min {min(total)})  median {statistics.median(reloc):6.0f} (min {min(reloc)})")
