"""Print the size of a file every time it changes, for a limited time."""

import os
import sys
import time


def main(path, seconds):
    start, last = time.monotonic(), None
    while time.monotonic() - start < seconds:
        try:
            size = os.stat(path).st_size
        except FileNotFoundError:
            size = None
        if size != last:
            print(f"  {1000 * (time.monotonic() - start):7.1f} ms  size {size}", flush=True)
            last = size
        time.sleep(0.005)


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]))
