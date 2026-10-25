"""Test the store and its bug variants with four methods and print which method finds which bug."""

import os
import random
import shlex
import shutil
import signal
import subprocess
import sys
import time

import crashsim
import kvcheck
import simkv

VARIANTS = ["none", "ack-before-fsync", "no-dir-fsync", "double-apply", "no-crc-check"]
SHORT = ["put a 1", "add c 5", "put b 2", "checkpoint", "add c 3", "del a", "put d 4", "checkpoint", "add c 2", "put e 5"]


def long_workload():
    commands = []
    for block in range(6):
        for i in range(10):
            commands.append("add c 1" if i % 2 else f"put k{block}{i} {i}")
        commands.append("checkpoint")
    return commands


def bug_args(bug):
    return ["--bug", bug] if bug != "none" else []


def write_commands(path, commands):
    with open(path, "w") as f:
        f.write("\n".join(commands) + "\n")


def run_store(kv, directory, commands_file, acks_file, bug, env=None):
    shell = f"exec {shlex.quote(kv)} {shlex.quote(directory)} {' '.join(bug_args(bug))} < {shlex.quote(commands_file)} > {shlex.quote(acks_file)} 2>/dev/null"
    return subprocess.Popen(["sh", "-c", shell], env=env)


def kill_loop(kv, out, bug, runs, rng):
    commands = long_workload()
    commands_file, acks, data = os.path.join(out, "long.txt"), os.path.join(out, "acks.txt"), os.path.join(out, "data")
    write_commands(commands_file, commands)
    bad, example = 0, None
    for _ in range(runs):
        shutil.rmtree(data, ignore_errors=True)
        os.makedirs(data)
        if os.path.exists(acks):
            os.remove(acks)
        proc = run_store(kv, data, commands_file, acks, bug)
        time.sleep(rng.uniform(0, 0.06))
        proc.send_signal(signal.SIGKILL)
        proc.wait()
        outcome = kvcheck.classify(kv, data, commands, acks, bug_args(bug))
        if outcome != "correct":
            bad += 1
            example = example or outcome
    return bad, runs, example


def fault_injection(kv, out, bug, shim):
    commands_file, acks, data = os.path.join(out, "short.txt"), os.path.join(out, "acks.txt"), os.path.join(out, "data")
    write_commands(commands_file, SHORT)
    bad, runs, example = 0, 0, None
    for call in ("fdatasync", "fsync", "write"):
        for errno in ("EIO", "ENOSPC"):
            for at in range(1, 16):
                shutil.rmtree(data, ignore_errors=True)
                os.makedirs(data)
                env = dict(os.environ, LD_PRELOAD=shim, FAULT_CALL=call, FAULT_AT=str(at), FAULT_ERRNO=errno)
                run_store(kv, data, commands_file, acks, bug, env).wait()
                outcome = kvcheck.classify(kv, data, SHORT, acks, bug_args(bug))
                runs += 1
                if outcome != "correct":
                    bad += 1
                    example = example or f"{call} #{at} with {errno}: {outcome}"
    return bad, runs, example


def simulation(kv, out, bug):
    workdir, trace = os.path.join(out, "data"), os.path.join(out, "trace")
    shutil.rmtree(workdir, ignore_errors=True)
    os.makedirs(workdir)
    commands_file = os.path.join(out, "short.txt")
    write_commands(commands_file, SHORT)
    initial = crashsim.snapshot(workdir)
    shell = f"exec {shlex.quote(kv)} . {' '.join(bug_args(bug))} < {shlex.quote(commands_file)}"
    crashsim.run_traced(["sh", "-c", shell], workdir, trace)
    sim = crashsim.Simulator(crashsim.Trace(trace, workdir, initial))
    check = simkv.make_check(kv, os.path.join(out, "scratch"), simkv.expected_states(SHORT), bug_args(bug))
    result = crashsim.check_all(sim, check)
    example = None
    if result["first_bad_process"]:
        example = "process crash: " + result["first_bad_process"][1]
    elif result["first_bad"]:
        example = "machine crash: " + result["first_bad"][3]
    return result, example


def damaged_files(kv, out, bug):
    commands_file, acks, data = os.path.join(out, "short.txt"), os.path.join(out, "acks.txt"), os.path.join(out, "data")
    write_commands(commands_file, SHORT)
    states = simkv.expected_states(SHORT)
    bad, runs, example = 0, 0, None
    damages = [("last byte set to zero", 1, None), ("last 2 bytes set to zero", 2, None),
               ("last 3 bytes set to zero", 3, None), ("one bit of the last byte flipped", 0, 1)]
    for label, zeros, bit in damages:
        shutil.rmtree(data, ignore_errors=True)
        os.makedirs(data)
        run_store(kv, data, commands_file, acks, bug).wait()
        segment = os.path.join(data, max(f for f in os.listdir(data) if f.startswith("log.")))
        with open(segment, "r+b") as f:
            size = f.seek(0, 2)
            if zeros:
                f.seek(size - zeros)
                f.write(b"\0" * zeros)
            else:
                f.seek(size - 1)
                byte = f.read(1)[0]
                f.seek(size - 1)
                f.write(bytes([byte ^ bit]))
        recovered, info = simkv.dump(kv, data, bug_args(bug))
        runs += 1
        if recovered not in states:
            bad += 1
            example = example or f"{label}: recovered {sorted(recovered.items()) if recovered else info}"
    return bad, runs, example


def main(kv, out, shim, kill_runs):
    rng = random.Random(20)
    print("short workload (fault injection, simulator, damaged files): " + "; ".join(SHORT))
    print(f"long workload (kill -9 loop): 60 operations, a checkpoint after every 10, {kill_runs} kills per variant")
    rows, examples = [], []
    for bug in VARIANTS:
        kill = kill_loop(kv, out, bug, kill_runs, rng)
        fault = fault_injection(kv, out, bug, shim)
        sim, sim_example = simulation(kv, out, bug)
        damage = damaged_files(kv, out, bug)
        rows.append((bug, kill, fault, sim, damage))
        for method, example in (("kill -9", kill[2]), ("fault injection", fault[2]), ("simulator", sim_example), ("damaged files", damage[2])):
            if example:
                examples.append(f"  {bug}, {method}: {example}")
    print()
    print(f"{'variant':<18}{'kill -9 loop':>16}{'fault injection':>18}{'simulator, process':>21}{'simulator, machine':>21}{'damaged files':>16}")
    for bug, kill, fault, sim, damage in rows:
        cells = [
            f"{kill[0]} of {kill[1]}",
            f"{fault[0]} of {fault[1]}",
            f"{sim['process_bad']} of {sim['process']}",
            f"{sim['machine_bad']} of {sim['machine']}",
            f"{damage[0]} of {damage[1]}",
        ]
        print(f"{bug:<18}{cells[0]:>16}{cells[1]:>18}{cells[2]:>21}{cells[3]:>21}{cells[4]:>16}")
    print()
    print("first bad outcome of each method that found something:")
    for line in examples:
        print(line)
    for name in ("data", "scratch"):
        shutil.rmtree(os.path.join(out, name), ignore_errors=True)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3]), int(sys.argv[4]))
