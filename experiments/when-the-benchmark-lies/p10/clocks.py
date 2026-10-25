import time
import timeit

for name in ("time", "monotonic", "perf_counter", "process_time"):
    info = time.get_clock_info(name)
    print(f"time.{name}: {info.implementation}, monotonic={info.monotonic}, "
          f"adjustable={info.adjustable}, resolution={info.resolution}")

for name in ("time", "perf_counter", "perf_counter_ns"):
    calls = 1_000_000
    best = min(timeit.repeat(f"time.{name}()", setup="import time", number=calls, repeat=5))
    print(f"time.{name}(): {best / calls * 1e9:.1f} ns per call (best of 5 runs of {calls} calls)")
