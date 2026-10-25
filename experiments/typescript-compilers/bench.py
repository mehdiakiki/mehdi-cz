"""Runs TypeScript compilers on a project: once, timed, or with thread sampling.

Usage, from the fixture directory:
  python3 -I bench.py check PROJECT LABEL VARIANT... [-- EXTRA_FLAG...]
  python3 -I bench.py time PROJECT RUNS VARIANT...
  python3 -I bench.py threads PROJECT VARIANT...
  python3 -I bench.py buildinfo PROJECT VARIANT...
  python3 -I bench.py faults PROJECT RUNS VARIANT...
  python3 -I bench.py syscalls PROJECT VARIANT...
  python3 -I bench.py vmstat PROJECT RUNS VARIANT...
"""

import collections
import os
import re
import statistics
import sys
import time

TSC6 = ["node", "out/npm/ts6/node_modules/typescript/bin/tsc"]
TSC7 = ["node", "out/npm/ts7/node_modules/typescript/bin/tsc"]
TSC7_BIN = ["out/npm/ts7/node_modules/@typescript/typescript-linux-x64/lib/tsc"]
TSC71 = ["node", "out/npm/ts71/node_modules/typescript/bin/tsc"]
TSRS = ["node", "out/npm/tsrs/node_modules/tsrs/bin/tsrs"]
TSRS_BIN = ["out/npm/tsrs/node_modules/@tsrs/linux-x64-gnu/tsrs"]
P_CORES = ["taskset", "-c", "0-7"]
E_CORES = ["taskset", "-c", "8-15"]
THP_DEFAULT = ["python3", "-I", "thp.py", "default"]
THP_OFF = ["python3", "-I", "thp.py", "off"]
MIMALLOC_THP_OFF = ["env", "MIMALLOC_ALLOW_THP=0"]
VMSTAT = ["compact_stall", "compact_fail", "allocstall_movable", "thp_fault_alloc", "thp_fault_fallback"]

VARIANTS = {
    "tsc6": TSC6,
    "tsc6-stable-order": TSC6 + ["--stableTypeOrdering"],
    "tsc7": TSC7,
    "tsc7-bin": TSC7_BIN,
    "tsc7-single": TSC7 + ["--singleThreaded"],
    "tsc7-checkers1": TSC7 + ["--checkers", "1"],
    "tsc7-checkers2": TSC7 + ["--checkers", "2"],
    "tsc7-checkers8": TSC7 + ["--checkers", "8"],
    "tsc7-checkers16": TSC7 + ["--checkers", "16"],
    "tsc7.1": TSC71,
    "tsrs": TSRS,
    "tsrs-bin": TSRS_BIN,
    "tsrs-single": TSRS + ["--singleThreaded"],
    "tsrs-checkers1": TSRS + ["--checkers", "1"],
    "tsrs-checkers2": TSRS + ["--checkers", "2"],
    "tsrs-checkers4": TSRS + ["--checkers", "4"],
    "tsrs-checkers8": TSRS + ["--checkers", "8"],
    "tsrs-checkers16": TSRS + ["--checkers", "16"],
    "tsrs-go-order": TSRS + ["--checkerAssignment", "go", "--checkers", "4"],
    "tsc6-pcores": P_CORES + TSC6,
    "tsc7-pcores": P_CORES + TSC7,
    "tsc7-ecores": E_CORES + TSC7,
    "tsrs-single-pcores": P_CORES + TSRS + ["--singleThreaded"],
    "tsrs-single-ecores": E_CORES + TSRS + ["--singleThreaded"],
    "tsrs-checkers4-pcores": P_CORES + TSRS + ["--checkers", "4"],
    "tsrs-checkers4-ecores": E_CORES + TSRS + ["--checkers", "4"],
    "tsc7-thp-default": THP_DEFAULT + TSC7,
    "tsc7-thp-off": THP_OFF + TSC7,
    "tsrs-thp-default": ["env"] + TSRS,
    "tsrs-thp-off": MIMALLOC_THP_OFF + TSRS,
    "tsrs-single-thp-default": ["env"] + TSRS + ["--singleThreaded"],
    "tsrs-single-thp-off": MIMALLOC_THP_OFF + TSRS + ["--singleThreaded"],
}

INCREMENTAL = "+incremental"


def command(variant, project, buildinfo, extra=()):
    return VARIANTS[variant.removesuffix(INCREMENTAL)] + [
        "-p", project, "--noEmit",
        "--declarationMap", "false", "--emitDeclarationOnly", "false",
        "--tsBuildInfoFile", buildinfo, *extra,
    ]


def buildinfo_for(variant, project):
    if not variant.endswith(INCREMENTAL):
        return "/dev/null"
    name = project.replace("/", "_") + "-" + variant + ".tsbuildinfo"
    return os.path.join("out", "buildinfo", name)


def spawn(argv, output):
    actions = [
        (os.POSIX_SPAWN_OPEN, 1, output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644),
        (os.POSIX_SPAWN_DUP2, 1, 2),
    ]
    return os.posix_spawnp(argv[0], argv, os.environ, file_actions=actions)


def run(argv, output):
    start = time.perf_counter_ns()
    pid = spawn(argv, output)
    _, status, usage = os.wait4(pid, 0)
    wall = (time.perf_counter_ns() - start) / 1e6
    return {
        "wall": wall,
        "user": usage.ru_utime * 1000,
        "sys": usage.ru_stime * 1000,
        "rss": usage.ru_maxrss / 1024,
        "minflt": usage.ru_minflt,
        "majflt": usage.ru_majflt,
        "nvcsw": usage.ru_nvcsw,
        "nivcsw": usage.ru_nivcsw,
        "exit": os.waitstatus_to_exitcode(status),
    }


def output_path(label, variant):
    os.makedirs(os.path.join("out", "outputs"), exist_ok=True)
    return os.path.join("out", "outputs", f"{label}-{variant}.txt")


def check(project, label, args):
    variants, extra = (args[: args.index("--")], args[args.index("--") + 1 :]) if "--" in args else (args, [])
    for variant in variants:
        out = output_path(label, variant)
        result = run(command(variant, project, "/dev/null", ["--pretty", "false", *extra]), out)
        with open(out) as f:
            text = f.read()
        lines = text.count("\n")
        print(f"== {variant}: exit {result['exit']}, {lines} output lines")
        print(text, end="" if text.endswith("\n") or not text else "\n")


def prime(project, variants):
    os.makedirs(os.path.join("out", "buildinfo"), exist_ok=True)
    for variant in variants:
        if variant.endswith(INCREMENTAL):
            run(command(variant, project, buildinfo_for(variant, project)), output_path("prime", variant))


def buildinfo_check(project, variants):
    os.makedirs(os.path.join("out", "buildinfo"), exist_ok=True)
    print("wall time of three runs per compiler: a new build info file, the same file again, /dev/null")
    for variant in variants:
        path = os.path.join("out", "buildinfo", f"check-{variant}-{time.time_ns()}.tsbuildinfo")
        fresh = run(command(variant, project, path), output_path("buildinfo", variant))
        size = os.path.getsize(path) / 1024
        again = run(command(variant, project, path), output_path("buildinfo", variant))
        null = run(command(variant, project, "/dev/null"), output_path("buildinfo", variant))
        print(f"{variant:<8} new file {fresh['wall']:>6.0f} ms ({size:.0f} KiB written)  "
              f"same file {again['wall']:>6.0f} ms  /dev/null {null['wall']:>6.0f} ms")


def faults(project, runs, variants):
    for variant in variants:
        run(command(variant, project, "/dev/null"), output_path("warmup", variant))
    samples = {variant: [] for variant in variants}
    for round_number in range(runs):
        shift = round_number % len(variants)
        for variant in variants[shift:] + variants[:shift]:
            samples[variant].append(run(command(variant, project, "/dev/null"), output_path("faults", variant)))
    print(f"project {project}, {runs} runs per variant after one warm-up run, interleaved")
    print("medians of wall, user and system time, page faults and context switches (os.wait4),")
    print("and the largest number of major page faults in any run")
    print()
    print(f"{'variant':<14} {'wall':>8} {'user':>8} {'sys':>8} {'minor faults':>13} {'major':>6} "
          f"{'major max':>9} {'voluntary cs':>13} {'involuntary cs':>15}")
    for variant in variants:
        s = samples[variant]

        def med(key):
            return statistics.median(x[key] for x in s)

        print(f"{variant:<14} {med('wall'):>5.0f} ms {med('user'):>5.0f} ms {med('sys'):>5.0f} ms "
              f"{med('minflt'):>13.0f} {med('majflt'):>6.0f} {max(x['majflt'] for x in s):>9} "
              f"{med('nvcsw'):>13.0f} {med('nivcsw'):>15.0f}")


def read_vmstat():
    with open("/proc/vmstat") as f:
        counters = dict(line.split() for line in f)
    return {name: int(counters.get(name, 0)) for name in VMSTAT}


def vmstat(project, runs, variants):
    samples = {variant: [] for variant in variants}
    for round_number in range(runs):
        shift = round_number % len(variants)
        for variant in variants[shift:] + variants[:shift]:
            before = read_vmstat()
            result = run(command(variant, project, "/dev/null"), output_path("vmstat", variant))
            after = read_vmstat()
            result.update({name: after[name] - before[name] for name in VMSTAT})
            samples[variant].append(result)
    print(f"project {project}, {runs} runs per variant, interleaved")
    print("medians of the change of system-wide /proc/vmstat counters during one run, and of system time")
    print()
    print(f"{'variant':<24} {'sys':>8} " + " ".join(f"{name:>18}" for name in VMSTAT))
    for variant in variants:
        s = samples[variant]
        values = " ".join(f"{statistics.median(x[name] for x in s):>18.0f}" for name in VMSTAT)
        print(f"{variant:<24} {statistics.median(x['sys'] for x in s):>5.0f} ms {values}")


def syscalls(project, variants):
    os.makedirs(os.path.join("out", "strace"), exist_ok=True)
    for variant in variants:
        summary = os.path.join("out", "strace", f"{variant}.txt")
        run(["strace", "-f", "-c", "-o", summary] + command(variant, project, "/dev/null"),
            output_path("strace", variant))
        with open(summary) as f:
            lines = f.read().splitlines()
        print(f"== {variant}: strace -f -c, the ten system calls with the most system time")
        print("\n".join(lines[:12]))
        print(lines[-1])
        trace = os.path.join("out", "strace", f"{variant}-madvise.txt")
        run(["strace", "-f", "-e", "trace=madvise", "-o", trace] + command(variant, project, "/dev/null"),
            output_path("strace", variant))
        with open(trace) as f:
            advice = collections.Counter(re.findall(r"MADV_[A-Z_]+", f.read()))
        print("madvise calls by advice: " + ", ".join(f"{name} {count}" for name, count in sorted(advice.items())))
        trace = os.path.join("out", "strace", f"{variant}-prctl.txt")
        run(THP_OFF + ["strace", "-f", "-e", "trace=prctl", "-o", trace] + command(variant, project, "/dev/null"),
            output_path("strace", variant))
        with open(trace) as f:
            calls = [line.split(" ", 1)[1].strip() for line in f if "THP_DISABLE" in line]
        print("started with huge pages turned off (thp.py off), its prctl calls about them:")
        print("\n".join(calls) if calls else "none")
        print()


def median_range(values):
    return statistics.median(values), min(values), max(values)


def timing(project, runs, variants):
    prime(project, variants)
    for variant in variants:
        run(command(variant, project, buildinfo_for(variant, project)), output_path("warmup", variant))
    samples = {variant: [] for variant in variants}
    for round_number in range(runs):
        shift = round_number % len(variants)
        for variant in variants[shift:] + variants[:shift]:
            out = output_path("timed", variant)
            result = run(command(variant, project, buildinfo_for(variant, project)), out)
            result["lines"] = sum(1 for _ in open(out))
            result["round"] = round_number + 1
            samples[variant].append(result)
    print(f"project {project}, {runs} measured runs per variant after one warm-up run, interleaved")
    print()
    print("raw samples: variant round wall_ms user_ms sys_ms maxrss_MiB exit output_lines")
    for variant in variants:
        for s in samples[variant]:
            print(f"{variant} {s['round']} {s['wall']:.0f} {s['user']:.0f} {s['sys']:.0f} "
                  f"{s['rss']:.1f} {s['exit']} {s['lines']}")
    print()
    print(f"{'variant':<22} {'wall median':>11} {'wall min-max':>13} {'cpu median':>10} "
          f"{'cpu/wall':>8} {'RSS median':>10} {'RSS min-max':>13}")
    for variant in variants:
        s = samples[variant]
        wall, wall_min, wall_max = median_range([x["wall"] for x in s])
        cpu = statistics.median([x["user"] + x["sys"] for x in s])
        rss, rss_min, rss_max = median_range([x["rss"] for x in s])
        print(f"{variant:<22} {wall:>8.0f} ms {wall_min:>6.0f}-{wall_max:<6.0f} {cpu:>7.0f} ms "
              f"{cpu / wall:>8.2f} {rss:>6.0f} MiB {rss_min:>6.0f}-{rss_max:<6.0f}")


def task_stats(pid):
    stats = {}
    try:
        tids = os.listdir(f"/proc/{pid}/task")
    except FileNotFoundError:
        return stats
    for tid in tids:
        try:
            with open(f"/proc/{pid}/task/{tid}/stat") as f:
                fields = f.read().rsplit(")", 1)[1].split()
        except (FileNotFoundError, ProcessLookupError, IndexError):
            continue
        stats[tid] = (fields[0], int(fields[11]) + int(fields[12]), int(fields[36]))
    return stats


def comm(pid):
    try:
        with open(f"/proc/{pid}/comm") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "?"


def threads(project, variants):
    tick_ms = 1000 / os.sysconf("SC_CLK_TCK")
    print(f"project {project}, one sampled run per variant, sampling /proc every millisecond")
    print("only the samples of the final program count (not the Node.js launcher before execve)")
    print("columns: program name, most threads seen, threads that used 20 ms of CPU or more,")
    print("most threads running at the same moment, average running threads, share of running")
    print("samples on the performance cores (CPUs 0-7), cpu time / wall time")
    print()
    for variant in variants:
        start = time.perf_counter_ns()
        pid = spawn(command(variant, project, "/dev/null"), output_path("threads", variant))
        samples = []
        while True:
            done, status, usage = os.wait4(pid, os.WNOHANG)
            if done == pid:
                break
            samples.append((comm(pid), task_stats(pid)))
            time.sleep(0.001)
        wall = (time.perf_counter_ns() - start) / 1e6
        cpu = (usage.ru_utime + usage.ru_stime) * 1000
        name = next((n for n, _ in reversed(samples) if n != "?"), "?")
        own = [stats for n, stats in samples if n == name and stats]
        running = [[t for t in stats.values() if t[0] == "R"] for stats in own]
        on_any = sum(len(r) for r in running)
        on_pcore = sum(1 for r in running for t in r if t[2] < 8)
        cpu_by_tid = {}
        for stats in own:
            for tid, t in stats.items():
                cpu_by_tid[tid] = t[1]
        busy = sum(1 for ticks in cpu_by_tid.values() if ticks * tick_ms >= 20)
        most = max((len(stats) for stats in own), default=0)
        peak = max((len(r) for r in running), default=0)
        average = on_any / len(running) if running else 0
        share = on_pcore / on_any if on_any else 0
        print(f"{variant:<22} {name:<16} threads {most:>3}  busy {busy:>3}  "
              f"running max {peak:>3} avg {average:>5.2f}  "
              f"P-core share {share:>4.0%}  cpu/wall {cpu / wall:>5.2f}  exit {os.waitstatus_to_exitcode(status)}")


def main():
    mode, project = sys.argv[1], sys.argv[2]
    if mode == "check":
        check(project, sys.argv[3], sys.argv[4:])
    elif mode == "time":
        timing(project, int(sys.argv[3]), sys.argv[4:])
    elif mode == "threads":
        threads(project, sys.argv[3:])
    elif mode == "buildinfo":
        buildinfo_check(project, sys.argv[3:])
    elif mode == "faults":
        faults(project, int(sys.argv[3]), sys.argv[4:])
    elif mode == "syscalls":
        syscalls(project, sys.argv[3:])
    elif mode == "vmstat":
        vmstat(project, int(sys.argv[3]), sys.argv[4:])
    else:
        sys.exit(f"unknown mode {mode}")


if __name__ == "__main__":
    main()
