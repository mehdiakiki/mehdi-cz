"""Replace a file with a temp file, fsync, rename and a directory fsync; --no-flush skips f.flush()."""

import os
import sys


def save(path, data, flush=True):
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
        if flush:
            f.flush()
        os.fsync(f.fileno())
    os.rename(tmp, path)
    dirfd = os.open(os.path.dirname(path) or ".", os.O_RDONLY)
    try:
        os.fsync(dirfd)
    finally:
        os.close(dirfd)


if __name__ == "__main__":
    save(sys.argv[1], b"name = new\n", flush="--no-flush" not in sys.argv)
