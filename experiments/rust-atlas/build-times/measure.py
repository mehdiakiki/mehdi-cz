#!/usr/bin/env python3
"""Measure Cargo build scenarios for the compile-time diagnosis cluster.

Every table in the articles comes from one of the scenario groups below.

    python3 measure.py split      -> 1 crate vs 3 crates vs 12 crates
    python3 measure.py diag       -> cold / no-op / leaf edit / root edit
    python3 measure.py thrash     -> feature and RUSTFLAGS driven rebuilds
    python3 measure.py all        -> every group

Every scenario, cold builds included, is the median of three runs. CPU time is
user+system of the child processes, so it shows total work rather than work
divided by cores.
"""

import argparse
import os
import pathlib
import re
import resource
import shutil
import statistics
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parent
REPEATS = 3

# Absolute path so no shell alias or wrapper sits between us and Cargo.
CARGO = os.environ.get("CARGO_BIN", str(pathlib.Path.home() / ".cargo/bin/cargo"))


def child_cpu() -> float:
    usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    return usage.ru_utime + usage.ru_stime


def run(args: list[str], cwd: pathlib.Path, env: dict[str, str] | None = None) -> tuple[float, float, str]:
    """Run one command. Return (wall seconds, child CPU seconds, stderr)."""
    full_env = dict(os.environ)
    if env:
        full_env.update(env)
    before = child_cpu()
    start = time.perf_counter()
    proc = subprocess.run(args, cwd=cwd, env=full_env, capture_output=True, text=True)
    wall = time.perf_counter() - start
    cpu = child_cpu() - before
    if proc.returncode != 0:
        raise SystemExit(f"command failed: {args}\n{proc.stderr}")
    return wall, cpu, proc.stderr


def clean(workspace: pathlib.Path) -> None:
    shutil.rmtree(workspace / "target", ignore_errors=True)


COUNTER = [0]


def edit_constant(path: pathlib.Path) -> None:
    """Change one integer literal -> a real semantic edit, not a touch."""
    COUNTER[0] += 1
    text = path.read_text(encoding="utf-8")
    new = re.sub(r"const SALT: u64 = \d+;",
                 f"const SALT: u64 = {900_000_000 + COUNTER[0]};",
                 text, count=1)
    if new == text:
        raise SystemExit(f"no SALT constant found in {path}")
    path.write_text(new, encoding="utf-8")


def edit_root(path: pathlib.Path) -> None:
    """Change the root crate body -> a real semantic edit."""
    COUNTER[0] += 1
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\n// measure marker \d+\n$", "\n", text)
    path.write_text(text + f"\n// measure marker {COUNTER[0]}\n", encoding="utf-8")


def compiled_crates(stderr: str) -> list[str]:
    return [line.split()[1] for line in stderr.splitlines() if line.strip().startswith("Compiling ")]


def median_run(label: str, args: list[str], cwd: pathlib.Path, prepare=None, repeats: int = REPEATS,
               env: dict[str, str] | None = None) -> None:
    walls: list[float] = []
    cpus: list[float] = []
    names: list[str] = []
    for _ in range(repeats):
        if prepare:
            prepare()
        wall, cpu, stderr = run(args, cwd, env)
        walls.append(wall)
        cpus.append(cpu)
        names = compiled_crates(stderr)
    units = ",".join(names) if names else "-"
    print(f"{label:<42} {statistics.median(walls):7.2f} s wall {statistics.median(cpus):7.2f} s cpu   [{units}]")


# --------------------------------------------------------------------------


def group_split(jobs: str) -> None:
    print(f"\n== split variants, cargo build -j {jobs} (same code, different crate count)")
    for variant in ("split-1", "split-3", "split-12"):
        ws = ROOT / variant
        build = [CARGO, "build", "--offline", "-j", jobs]

        median_run(f"{variant} cold", build, ws, prepare=lambda ws=ws: clean(ws))
        median_run(f"{variant} no-op", build, ws)

        leaf = ws / ("app/src/m00.rs" if variant == "split-1" else "part00/src/m00.rs")
        median_run(f"{variant} edit leaf module", build, ws, prepare=lambda p=leaf: edit_constant(p))

        root = ws / "app/src/lib.rs"
        median_run(f"{variant} edit root crate", build, ws, prepare=lambda p=root: edit_root(p))


def group_diag() -> None:
    ws = ROOT / "diag"
    build = [CARGO, "build", "--offline"]
    print("\n== diag workspace (app -> core-b -> core-a, core-b has a build script)")

    median_run("diag cold", build, ws, prepare=lambda: clean(ws))
    median_run("diag no-op", build, ws)
    median_run("diag edit core-a (leaf)", build, ws, prepare=lambda: edit_root(ws / "core-a/src/lib.rs"))
    median_run("diag edit core-b (middle)", build, ws, prepare=lambda: edit_root(ws / "core-b/src/lib.rs"))
    median_run("diag edit app (root)", build, ws, prepare=lambda: edit_root(ws / "app/src/main.rs"))


def group_thrash() -> None:
    ws = ROOT / "diag"
    build = [CARGO, "build", "--offline"]
    only_a = [CARGO, "build", "--offline", "-p", "core-a"]
    print("\n== rebuilds caused by changing the command, not the code")
    print("   each line is the FIRST occurrence of that change on a warm target dir")

    def cycle(title: str, first: list[str], first_env, second: list[str], second_env) -> None:
        clean(ws)
        run(build, ws)
        median_run(f"{title}: 1st", first, ws, repeats=1, env=first_env)
        median_run(f"{title}: repeat", first, ws, repeats=1, env=first_env)
        median_run(f"{title}: switch back", second, ws, repeats=1, env=second_env)

    cycle("feature set (build -p core-a)", only_a, None, build, None)
    cycle("RUSTFLAGS=-C debuginfo=1", build, {"RUSTFLAGS": "-C debuginfo=1"}, build, None)
    cycle("DIAG_TAG=one", build, {"DIAG_TAG": "one"}, build, {"DIAG_TAG": "two"})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("group", choices=["split", "diag", "thrash", "all"])
    parser.add_argument("-j", dest="jobs", default=str(os.cpu_count()))
    args = parser.parse_args()

    # Scenarios edit the sources, so start from freshly generated fixtures.
    subprocess.run(["python3", str(ROOT / "generate.py")], check=True, capture_output=True)

    if args.group in ("split", "all"):
        group_split(args.jobs)
    if args.group in ("diag", "all"):
        group_diag()
    if args.group in ("thrash", "all"):
        group_thrash()


if __name__ == "__main__":
    main()
