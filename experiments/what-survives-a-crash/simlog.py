"""Run the log writer under the crash simulator and run the real recovery on every crash state."""

import os
import re
import shutil
import subprocess
import sys

import crashsim


def make_check(applog, scratch):
    def check(state, acks):
        shutil.rmtree(scratch, ignore_errors=True)
        os.makedirs(scratch)
        crashsim.materialize(state, scratch)
        out = subprocess.run([applog, "recover", "log"], cwd=scratch, capture_output=True, text=True).stdout
        match = re.match(r"recovered (\d+) records, tail (\w+), .* content ok: (\w+)", out)
        if not match:
            return f"recovery failed: {out.strip()}"
        recovered, content_ok = int(match.group(1)), match.group(3) == "true"
        if not content_ok:
            return f"recovery returned damaged records: {out.strip()}"
        if recovered < len(acks):
            return f"{len(acks)} records were acknowledged, recovery found {recovered}"
        return None
    return check


def tails(sim, applog, scratch):
    """Count what the recovery found at the end of the log, over the distinct machine crash states."""
    seen, counts = set(), {}
    for k in range(len(sim.events) + 1):
        for state, _ in sim.machine_states(k):
            key = tuple(sorted((p, v[0], v[1] if len(v) > 1 else None) for p, v in state.items()))
            if key in seen:
                continue
            seen.add(key)
            shutil.rmtree(scratch, ignore_errors=True)
            os.makedirs(scratch)
            crashsim.materialize(state, scratch)
            if "log" not in state:
                label = "no log file"
            else:
                out = subprocess.run([applog, "recover", "log"], cwd=scratch, capture_output=True, text=True).stdout
                label = re.match(r"recovered \d+ records, tail (\w+)", out).group(1)
            counts[label] = counts.get(label, 0) + 1
    return ", ".join(f"{label} {n}" for label, n in sorted(counts.items()))


def describe(state):
    entry = state.get("log")
    return [f"log: {len(entry[1])} bytes" if entry else "log: missing"]


def main(applog, out):
    print(crashsim.__doc__.strip())
    print()
    for mode in ("fsync", "fsync-no-dir"):
        workdir = os.path.join(out, mode)
        shutil.rmtree(workdir, ignore_errors=True)
        os.makedirs(workdir)
        initial = crashsim.snapshot(workdir)
        trace = os.path.join(out, mode + ".trace")
        crashsim.run_traced([applog, "append", "log", "12", mode], workdir, trace)
        sim = crashsim.Simulator(crashsim.Trace(trace, workdir, initial))
        result = crashsim.check_all(sim, make_check(applog, os.path.join(out, "scratch")))
        crashsim.report(f"append 12 records, fdatasync and print ok after each (applog append log 12 {mode})",
                        sim, result, describe)
        print(f"  end of the log in the distinct machine states: {tails(sim, applog, os.path.join(out, 'scratch'))}")
        shutil.rmtree(workdir)
        os.remove(trace)
    shutil.rmtree(os.path.join(out, "scratch"), ignore_errors=True)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]))
