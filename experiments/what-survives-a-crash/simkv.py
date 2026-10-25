"""Run the key-value store under the crash simulator and run its real recovery on every crash state."""

import os
import shlex
import shutil
import subprocess
import sys

import crashsim


def apply(store, op):
    verb, key, *rest = op.split(" ", 2)
    if verb == "put":
        store[key] = rest[0]
    elif verb == "del":
        store.pop(key, None)
    elif verb == "add":
        store[key] = str(int(store.get(key, "0")) + int(rest[0]))


def expected_states(commands):
    """The map after each prefix of the mutating commands."""
    states, store = [{}], {}
    for op in commands:
        if op.split(" ")[0] in ("put", "del", "add"):
            apply(store, op)
            states.append(dict(store))
    return states


def dump(kv, directory, bug_args):
    out = subprocess.run([kv, directory, "dump"] + bug_args, capture_output=True, text=True)
    if out.returncode != 0:
        return None, out.stderr.strip().splitlines()[-1] if out.stderr.strip() else "recovery failed"
    lines = out.stdout.splitlines()
    return dict(line.split("=", 1) for line in lines[1:]), lines[0]


def make_check(kv, scratch, states, bug_args):
    def check(state, acks):
        shutil.rmtree(scratch, ignore_errors=True)
        os.makedirs(scratch)
        crashsim.materialize(state, scratch)
        recovered, info = dump(kv, scratch, bug_args)
        if recovered is None:
            return f"recovery failed: {info}"
        acked = sum(1 for a in acks if a.startswith("ok "))
        for prefix in range(acked, len(states)):
            if recovered == states[prefix]:
                return None
        return f"{acked} operations acknowledged, recovered {sorted(recovered.items())} is not the result of any allowed prefix"
    return check


def describe(state):
    files = sorted(p for p, v in state.items() if v[0] == "file")
    return [f"{p}: {len(state[p][1])} bytes" for p in files] or ["no files"]


def run_scenario(kv, out, title, commands, bug_args, detail_op=None, initial_dir=None):
    workdir = os.path.join(out, "data")
    shutil.rmtree(workdir, ignore_errors=True)
    if initial_dir:
        shutil.copytree(initial_dir, workdir)
    else:
        os.makedirs(workdir)
    script = os.path.join(out, "commands")
    with open(script, "w") as f:
        f.write("\n".join(commands) + "\n")
    initial = crashsim.snapshot(workdir)
    trace = os.path.join(out, "trace")
    shell = f"exec {shlex.quote(kv)} . {' '.join(map(shlex.quote, bug_args))} < {shlex.quote(script)}"
    crashsim.run_traced(["sh", "-c", shell], workdir, trace)
    sim = crashsim.Simulator(crashsim.Trace(trace, workdir, initial))
    states = expected_states(commands)
    check = make_check(kv, os.path.join(out, "scratch"), states, bug_args)
    result = crashsim.check_all(sim, check)
    crashsim.report(title, sim, result, describe)
    if detail_op is not None:
        writes = [i for i, e in enumerate(sim.events) if e["kind"] == "data"]
        start = writes[detail_op - 1]
        end = writes[detail_op] - 1 if detail_op < len(writes) else len(sim.events) - 1
        print(f"  crash points around operation {detail_op} ({commands[detail_op - 1]}):")
        for k in range(start + 1, end + 2):
            machine = list(sim.machine_states(k))
            bad = sum(1 for state, _ in machine if check(state, sim.acks(k)))
            print(f"    after {sim.events[k - 1]['desc'][:46]:<46}  machine states {len(machine):>2}, bad {bad}")
    for name in ("data", "scratch"):
        shutil.rmtree(os.path.join(out, name), ignore_errors=True)
    for name in ("commands", "trace"):
        os.remove(os.path.join(out, name))
    return result


def prepare(kv, directory, commands):
    """Create a data directory by running the store on the commands, without tracing."""
    shutil.rmtree(directory, ignore_errors=True)
    os.makedirs(directory)
    subprocess.run([kv, directory], input="\n".join(commands) + "\n", text=True, check=True, stdout=subprocess.DEVNULL)


def run_recovery(kv, out, title, prepared, final, bug_args):
    """Trace one recovery, then check that a second recovery after any crash of it gives the final map."""
    workdir = os.path.join(out, "data")
    shutil.rmtree(workdir, ignore_errors=True)
    shutil.copytree(prepared, workdir)
    initial = crashsim.snapshot(workdir)
    trace = os.path.join(out, "trace")
    crashsim.run_traced([kv, ".", "dump"] + bug_args, workdir, trace)
    sim = crashsim.Simulator(crashsim.Trace(trace, workdir, initial))
    scratch = os.path.join(out, "scratch")

    def check(state, acks):
        shutil.rmtree(scratch, ignore_errors=True)
        os.makedirs(scratch)
        crashsim.materialize(state, scratch)
        recovered, info = dump(kv, scratch, bug_args)
        if recovered != final:
            changed = sorted(k for k in set(final) | set(recovered or {}) if final.get(k) != (recovered or {}).get(k))
            got = ", ".join(f"{k}={(recovered or {}).get(k)} instead of {final.get(k)}" for k in changed)
            return f"second recovery: {got}"
        return None

    result = crashsim.check_all(sim, check)
    crashsim.report(title, sim, result, describe)
    shutil.rmtree(workdir)
    shutil.rmtree(scratch, ignore_errors=True)
    os.remove(trace)


def main(kv, out, scenario):
    print(crashsim.__doc__.strip())
    print()
    ops = ["put a 1", "put b 2", "add c 5", "del a", "put d 4", "add c 3"]
    if scenario == "wal":
        run_scenario(kv, out, "correct order: append, fdatasync, apply, ack", ops, [], detail_op=3)
        run_scenario(kv, out, "bug: ack before fdatasync", ops, ["--bug", "ack-before-fsync"], detail_op=3)
    elif scenario == "checkpoint":
        commands = ops[:3] + ["begin-checkpoint", "put d 4", "add c 3", "end-checkpoint", "put e 5"]
        print("commands: " + "; ".join(commands))
        run_scenario(kv, out, "segments: switch the log, write the snapshot durably, then delete old segments",
                     commands, [])
        run_scenario(kv, out, "bug: old segments deleted before the snapshot is durable",
                     commands, ["--bug", "snapshot-not-durable"])
        run_scenario(kv, out, "bug: one log, truncated after the snapshot", commands, ["--bug", "lose-tail"])
    elif scenario == "recovery":
        commands = [f"add c {i}" for i in range(1, 11)] + [f"put k{i} {i}" for i in range(5)] + ["del k1", "add d 7"]
        final = expected_states(commands)[-1]
        print(f"prepared log: {len(commands)} operations, expected map after recovery: {sorted(final.items())}")
        for title, bug_args in [
            ("recovery with a snapshot that records the segment it covers", []),
            ("bug: the snapshot does not record what it covers, recovery replays every segment", ["--bug", "double-apply"]),
        ]:
            prepared = os.path.join(out, "prepared")
            prepare(kv, prepared, commands)
            run_recovery(kv, out, title, prepared, final, bug_args)
            shutil.rmtree(prepared)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), sys.argv[3])
