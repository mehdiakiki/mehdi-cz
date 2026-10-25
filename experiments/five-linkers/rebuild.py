"""Times cargo rebuilds of rg after touching main.rs, with several linker settings.

Usage: rebuild.py MANIFEST ROUNDS

The settings go to the final crate only (cargo rustc), and the dependencies
are not rebuilt. Runs are interleaved and the first round is a warm-up.
"""

import os
import statistics
import subprocess
import sys
import time


def settings():
    tools = os.environ["LINKER_TOOLS"]
    mold_bin = os.path.join(tools, "mold-3.0.0-x86_64-linux/bin")
    wild_ld = os.path.join(tools, "wild-ld")
    path = os.environ["PATH"]
    return [
        ("rust-lld (default)", [], path),
        ("gnu-ld", ["-C", "linker-features=-lld"], path),
        ("mold-3.0.0", ["-C", "link-arg=-fuse-ld=mold"], mold_bin + ":" + path),
        ("wild-0.11.0", ["-C", "linker-features=-lld", "-C", "link-arg=-B" + wild_ld], path),
    ]


def build(manifest, flags, path):
    cmd = ["cargo", "+1.99.1", "rustc", "--locked", "--offline", "--manifest-path", manifest, "--bin", "rg", "--"]
    env = dict(os.environ, PATH=path)
    t0 = time.perf_counter()
    subprocess.run(cmd + flags, env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return time.perf_counter() - t0


def made_by(binary):
    out = subprocess.run(["readelf", "-p", ".comment", binary], capture_output=True, text=True, check=True).stdout
    for marker in ("mold", "LLD", "Wild"):
        for line in out.splitlines():
            if marker in line:
                return line.split("]", 1)[1].strip().split(" (")[0]
    return "no linker name in .comment (GNU ld)"


def main():
    manifest, rounds = sys.argv[1], int(sys.argv[2])
    main_rs = os.path.join(os.path.dirname(manifest), "crates/core/main.rs")
    binary = os.path.join(os.environ["CARGO_TARGET_DIR"], "debug/rg")
    runs = settings()
    times = {name: [] for name, _, _ in runs}
    linker = {}
    print("round setting seconds")
    for r in range(rounds + 1):
        for name, flags, path in runs:
            os.utime(main_rs)
            seconds = build(manifest, flags, path)
            linker[name] = made_by(binary)
            print(f"{'warmup' if r == 0 else r} {name.split()[0]} {seconds:.3f}", flush=True)
            if r > 0:
                times[name].append(seconds)
    print()
    print(f"{'setting':<20} {'median':>8} {'min-max':>14}   linker named in .comment")
    for name, _, _ in runs:
        t = times[name]
        print(f"{name:<20} {statistics.median(t):>7.2f}s {min(t):>6.2f}-{max(t):.2f}s   {linker[name]}")


if __name__ == "__main__":
    main()
