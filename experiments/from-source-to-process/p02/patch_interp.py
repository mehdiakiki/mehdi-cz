import sys

src, dst = sys.argv[1], sys.argv[2]
data = open(src, "rb").read()
old = b"/lib64/ld-linux-x86-64.so.2"
if data.count(old) != 1:
    sys.exit("interpreter path not found exactly once")
open(dst, "wb").write(data.replace(old, old[:-1] + b"3"))
