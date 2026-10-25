"""Run the save program under the crash simulator and check every crash state."""

import os
import shutil
import subprocess
import sys

import crashsim

PIECES, PIECE = 64, 4096


def piece(version, index):
    header = f"v{version} piece {index:02}\n".encode()
    return header + bytes([ord("a") + version]) * (PIECE - len(header))


OLD = b"".join(piece(1, i) for i in range(PIECES))
NEW = b"".join(piece(2, i) for i in range(PIECES))


def classify(entry):
    if entry is None:
        return "missing"
    data = entry[1]
    if data == OLD:
        return "old version, complete"
    if data == NEW:
        return "new version, complete"
    if not data:
        return "empty file"
    if NEW.startswith(data):
        return f"new version, cut short at {len(data)} bytes"
    return f"{len(data)} bytes, neither version"


def check(state, acks):
    entry = state.get("doc.txt")
    data = entry[1] if entry else None
    if any(a.strip() == "saved" for a in acks):
        if data != NEW:
            return "the program printed saved, but doc.txt is not the new version"
    elif data not in (OLD, NEW):
        return "doc.txt is neither the old version nor the new version"
    return None


def describe(state):
    return [f"{path}: {classify(state.get(path))}" for path in ("doc.txt", "doc.txt.tmp") if path in state or path == "doc.txt"]


def main(save, out):
    print(crashsim.__doc__.strip())
    print()
    variants = [
        ("naive", "naive save: O_TRUNC and write in place"),
        ("rename", "temp file and rename, no fsync"),
        ("safe", "temp file, fsync, rename (no directory fsync)"),
        ("durable", "temp file, fsync, rename, fsync of the directory"),
    ]
    for mode, title in variants:
        workdir = os.path.join(out, mode)
        shutil.rmtree(workdir, ignore_errors=True)
        os.makedirs(workdir)
        subprocess.run([save, "durable", "doc.txt", "1", "0"], cwd=workdir, check=True, stdout=subprocess.DEVNULL)
        initial = crashsim.snapshot(workdir)
        trace = os.path.join(out, mode + ".trace")
        crashsim.run_traced([save, mode, "doc.txt", "2", "0"], workdir, trace)
        sim = crashsim.Simulator(crashsim.Trace(trace, workdir, initial))
        result = crashsim.check_all(sim, check)
        crashsim.report(f"{title} (save {mode})", sim, result, describe)
        shutil.rmtree(workdir)
        os.remove(trace)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]))
