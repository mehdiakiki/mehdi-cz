"""Relinks one captured rustc link command with several linkers.

Usage:
  relink.py time ARGS OUT ROUNDS     interleaved timing runs, one line per run
  relink.py threads ARGS OUT         processes and threads each linker creates
  relink.py once ARGS OUT            one link per default variant
  relink.py pair ARGS OUT PAIRS A B  A and B in alternating order, with paired differences
  relink.py perf ARGS OUT RUNS       mold 2.42.1 and 3.0.0 with --perf, median time per pass

ARGS is a file with one cc argument per line. OUT receives the outputs.
LINKER_TOOLS points to the directory with the downloaded linkers, and
RUST_SYSROOT to the sysroot of the toolchain that produced ARGS.
"""

import ctypes
import hashlib
import os
import re
import statistics
import subprocess
import sys
import time

PR_SET_CHILD_SUBREAPER = 36


PINNED_CPU = "2"


def variants():
    """Returns (name, extra cc arguments, command prefix) for every variant.

    The 1-thread variants run on CPU 2, and LLD, mold and wild get --threads=1.
    """
    tools = os.environ["LINKER_TOOLS"]
    gcc_ld = os.path.join(os.environ["RUST_SYSROOT"], "lib/rustlib/x86_64-unknown-linux-gnu/bin/gcc-ld")
    mold2 = os.path.join(tools, "mold-2.42.1-x86_64-linux/libexec/mold")
    mold3 = os.path.join(tools, "mold-3.0.0-x86_64-linux/libexec/mold")
    wild = os.path.join(tools, "wild-ld")
    default = [
        ("gnu-ld-2.46", ["-fuse-ld=bfd"]),
        ("gold-1.16", ["-fuse-ld=gold"]),
        ("lld-21.1.8", ["-fuse-ld=lld"]),
        ("rust-lld-23.1.1", ["-B" + gcc_ld, "-fuse-ld=lld"]),
        ("mold-2.42.1", ["-B" + mold2]),
        ("mold-3.0.0", ["-B" + mold3]),
        ("wild-0.11.0", ["-B" + wild]),
    ]
    single = []
    for name, extra in default:
        one = [] if name.startswith(("gnu-ld", "gold")) else ["-Wl,--threads=1"]
        single.append((name + "/1-thread", extra + one, ["taskset", "-c", PINNED_CPU]))
    return [(name, extra, []) for name, extra in default] + single


def base_args(path):
    """Returns the captured arguments without the linker choice and without -o."""
    with open(path) as f:
        args = f.read().splitlines()
    out = []
    skip = False
    for arg in args:
        if skip:
            skip = False
            continue
        if arg == "-o":
            skip = True
        elif arg.startswith("-fuse-ld="):
            continue
        elif arg.startswith("-B") and arg.rstrip("/").endswith("gcc-ld"):
            continue
        else:
            out.append(arg)
    return out


def command(base, extra, prefix, output):
    return prefix + ["cc"] + base + extra + ["-o", output]


def become_subreaper():
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "prctl(PR_SET_CHILD_SUBREAPER) failed")


def spawn(cmd, stderr_path, stdout_path):
    actions = [
        (os.POSIX_SPAWN_OPEN, 1, stdout_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644),
        (os.POSIX_SPAWN_OPEN, 2, stderr_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644),
    ]
    return os.posix_spawnp(cmd[0], cmd, os.environ, file_actions=actions)


def measured_run(cmd, stderr_path, stdout_path="/dev/null"):
    """Runs cmd and waits for it, then reaps every process it left behind.

    The "cc" numbers are what a parent that waits for cc sees. The "all"
    numbers also include children that the linker forked and that outlived cc.
    """
    t0 = time.perf_counter()
    pid = spawn(cmd, stderr_path, stdout_path)
    _, status, ru = os.wait4(pid, 0)
    t1 = time.perf_counter()
    cpu_cc = ru.ru_utime + ru.ru_stime
    rss_cc = ru.ru_maxrss
    cpu_all, rss_all, inblock, late = cpu_cc, rss_cc, ru.ru_inblock, 0
    while True:
        try:
            _, _, ru_late = os.wait4(-1, 0)
        except ChildProcessError:
            break
        late += 1
        cpu_all += ru_late.ru_utime + ru_late.ru_stime
        rss_all = max(rss_all, ru_late.ru_maxrss)
        inblock += ru_late.ru_inblock
    t2 = time.perf_counter()
    return {
        "exit": os.waitstatus_to_exitcode(status),
        "wall_cc": t1 - t0,
        "wall_all": t2 - t0,
        "cpu_cc": cpu_cc,
        "cpu_all": cpu_all,
        "rss_cc_mib": rss_cc / 1024,
        "rss_all_mib": rss_all / 1024,
        "read_kib": inblock / 2,
        "late": late,
    }


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()[:16]


def output_path(out, name):
    directory = os.path.join(out, name.replace("/", "-"))
    os.makedirs(directory, exist_ok=True)
    return os.path.join(directory, "rg")


def check(result, name, stderr_path):
    if result["exit"] != 0:
        with open(stderr_path) as f:
            sys.stderr.write(f.read())
        sys.exit(f"{name}: link failed with exit code {result['exit']}")


def fresh_run(base, extra, prefix, output, name, stdout_path="/dev/null"):
    if os.path.exists(output):
        os.remove(output)
    os.sync()
    stderr_path = output + ".stderr"
    result = measured_run(command(base, extra, prefix, output), stderr_path, stdout_path)
    check(result, name, stderr_path)
    return result


def print_row(label, order, name, result, output):
    print(
        f"{label} {order} {name} {result['exit']} {result['wall_cc']:.4f} {result['wall_all']:.4f} "
        f"{result['cpu_cc']:.3f} {result['cpu_all']:.3f} {result['rss_cc_mib']:.1f} "
        f"{result['rss_all_mib']:.1f} {result['read_kib']:.0f} {result['late']} {sha256(output)}",
        flush=True,
    )


HEADER = "round order variant exit wall_cc_s wall_all_s cpu_cc_s cpu_all_s rss_cc_mib rss_all_mib read_kib late output_sha256"


def time_mode(base, out, rounds):
    become_subreaper()
    runs = variants()
    os.makedirs(out, exist_ok=True)
    output = os.path.join(out, "rg")
    print(HEADER)
    for r in range(rounds + 1):
        shift = r % len(runs)
        for order, (name, extra, prefix) in enumerate(runs[shift:] + runs[:shift]):
            result = fresh_run(base, extra, prefix, output, name)
            print_row("warmup" if r == 0 else str(r), order, name, result, output)


def pair_mode(base, out, pairs, first, second):
    """Alternates two variants (AB, BA, AB, ...) and compares each pair."""
    become_subreaper()
    chosen = {name: (extra, prefix) for name, extra, prefix in variants() if name in (first, second)}
    os.makedirs(out, exist_ok=True)
    output = os.path.join(out, "rg")
    print(HEADER)
    walls = {first: [], second: []}
    for p in range(pairs + 1):
        names = (first, second) if p % 2 == 0 else (second, first)
        for order, name in enumerate(names):
            extra, prefix = chosen[name]
            result = fresh_run(base, extra, prefix, output, name)
            print_row("warmup" if p == 0 else str(p), order, name, result, output)
            if p > 0:
                walls[name].append(result["wall_cc"])
    diffs = sorted(b - a for a, b in zip(walls[first], walls[second]))
    slower = sum(d > 0 for d in diffs)
    print()
    print(f"pairs: {pairs}")
    for name in (first, second):
        print(f"{name} median {statistics.median(walls[name]):.4f}s, min {min(walls[name]):.4f}s, max {max(walls[name]):.4f}s")
    print(f"{second} minus {first}, per pair: median {statistics.median(diffs):+.4f}s, "
          f"middle half {diffs[len(diffs) // 4]:+.4f}s to {diffs[(3 * len(diffs)) // 4]:+.4f}s")
    print(f"{second} was slower in {slower} of {pairs} pairs")


PERF_LINE = re.compile(r"^\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)( +)(\S.*)$")


def perf_mode(base, out, count):
    """Runs both mold versions with --perf in alternating order and compares the passes."""
    become_subreaper()
    chosen = [v for v in variants() if v[0] in ("mold-2.42.1", "mold-3.0.0")]
    os.makedirs(out, exist_ok=True)
    output = os.path.join(out, "rg")
    table = os.path.join(out, "perf.txt")
    real = {name: {} for name, _, _ in chosen}
    passes = []
    for i in range(count + 1):
        for name, extra, prefix in chosen if i % 2 == 0 else chosen[::-1]:
            fresh_run(base, extra + ["-Wl,--perf"], prefix, output, name, table)
            if i == 0:
                continue
            with open(table) as f:
                for line in f:
                    m = PERF_LINE.match(line.rstrip())
                    if not m:
                        continue
                    key = (len(m.group(4)) - 2) // 2 * "  " + m.group(5)
                    if key not in passes:
                        passes.append(key)
                    real[name].setdefault(key, []).append(float(m.group(3)))
    first, second = (name for name, _, _ in chosen)
    print(f"median real seconds per pass over {count} runs each, from mold --perf")
    print(f"{'pass':<34} {first:>11} {second:>11} {'difference':>11}")
    print("('-' means that this version has no pass with this name)")
    for key in passes:
        a = statistics.median(real[first][key]) if key in real[first] else None
        b = statistics.median(real[second][key]) if key in real[second] else None
        if max(a or 0.0, b or 0.0) < 0.001:
            continue
        shown_a = f"{a:>10.3f}s" if a is not None else f"{'-':>11}"
        shown_b = f"{b:>10.3f}s" if b is not None else f"{'-':>11}"
        shown_d = f"{b - a:>+10.3f}s" if a is not None and b is not None else f"{'-':>11}"
        print(f"{key:<34} {shown_a} {shown_b} {shown_d}")


CLONE = re.compile(r"^(clone3?|fork|vfork)\((.*)\) += (\d+)$")
EXEC = re.compile(r'^execve\("([^"]+)".* = 0$')


def read_trace(directory):
    """Parses strace -ff files into process programs, forks and thread counts."""
    clones = {}
    execs = {}
    for entry in os.listdir(directory):
        if not entry.startswith("trace."):
            continue
        tid = int(entry.split(".")[1])
        with open(os.path.join(directory, entry)) as f:
            for line in f:
                line = line.rstrip()
                m = EXEC.match(line)
                if m:
                    execs[tid] = os.path.basename(m.group(1))
                    continue
                m = CLONE.match(line)
                if m:
                    kind, flags, child = m.group(1), m.group(2), int(m.group(3))
                    clones[child] = (tid, kind.startswith("clone") and "CLONE_THREAD" in flags)

    def process_of(tid):
        while tid in clones and clones[tid][1]:
            tid = clones[tid][0]
        return tid

    program = {process_of(tid): prog for tid, prog in execs.items()}
    forked_by = {child: process_of(creator) for child, (creator, thread) in clones.items() if not thread}
    threads_by = {}
    for creator, thread in clones.values():
        if thread:
            p = process_of(creator)
            threads_by[p] = threads_by.get(p, 0) + 1
    return program, forked_by, threads_by


def threads_mode(base, out):
    print("variant linker_program linker_processes threads_created")
    os.makedirs(out, exist_ok=True)
    output = os.path.join(out, "rg")
    for name, extra, prefix in variants():
        if os.path.exists(output):
            os.remove(output)
        directory = os.path.join(out, name.replace("/", "-") + ".strace")
        if os.path.isdir(directory):
            for n in os.listdir(directory):
                os.remove(os.path.join(directory, n))
        os.makedirs(directory, exist_ok=True)
        cmd = ["strace", "-ff", "-qq", "-e", "trace=execve,clone,clone3,fork,vfork", "-e", "signal=none"]
        cmd += ["-o", os.path.join(directory, "trace")]
        subprocess.run(cmd + command(base, extra, prefix, output), check=True, stdout=subprocess.DEVNULL)
        program, forked_by, threads_by = read_trace(directory)
        linker = {p for p, prog in program.items() if prog not in ("cc", "gcc", "collect2")}
        family = set(linker)
        for child, parent in sorted(forked_by.items()):
            if parent in family and child not in program:
                family.add(child)
        threads = sum(threads_by.get(p, 0) for p in family)
        names = ",".join(sorted({program[p] for p in linker}))
        print(f"{name} {names} {len(family)} {threads}", flush=True)


def once_mode(base, out):
    for name, extra, prefix in variants():
        if "/" in name:
            continue
        output = output_path(out, name)
        stderr_path = output + ".stderr"
        result = measured_run(command(base, extra, prefix, output), stderr_path)
        check(result, name, stderr_path)
        print(output)


def main():
    mode, args_file, out = sys.argv[1], sys.argv[2], sys.argv[3]
    base = base_args(args_file)
    if mode == "time":
        time_mode(base, out, int(sys.argv[4]))
    elif mode == "threads":
        threads_mode(base, out)
    elif mode == "perf":
        perf_mode(base, out, int(sys.argv[4]))
    elif mode == "pair":
        pair_mode(base, out, int(sys.argv[4]), sys.argv[5], sys.argv[6])
    elif mode == "once":
        become_subreaper()
        once_mode(base, out)
    else:
        sys.exit(f"unknown mode {mode}")


if __name__ == "__main__":
    main()
