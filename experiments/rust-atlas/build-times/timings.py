#!/usr/bin/env python3
"""Summarise a `cargo build --timings` report.

Cargo writes the per-unit schedule into the generated HTML as a JavaScript
array. This reads that array back and prints when each unit started, how long
it ran, and how its time splits between frontend, codegen, and link.

    python3 timings.py split-3
"""

import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
CARGO = pathlib.Path.home() / ".cargo/bin/cargo"


def collect(workspace: pathlib.Path) -> list[dict]:
    shutil.rmtree(workspace / "target", ignore_errors=True)
    subprocess.run([str(CARGO), "build", "--offline", "--timings"],
                   cwd=workspace, check=True, capture_output=True, text=True)
    html = (workspace / "target/cargo-timings/cargo-timing.html").read_text(encoding="utf-8")
    match = re.search(r"const UNIT_DATA = (\[.*?\]);\n", html, re.S)
    if not match:
        raise SystemExit("no UNIT_DATA in the timing report")
    return json.loads(match.group(1))


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "split-3"
    units = collect(ROOT / name)
    units.sort(key=lambda unit: unit["start"])

    print(f"{'unit':<24}{'start':>7}{'dur':>7}{'frontend':>10}{'codegen':>9}")
    total = 0.0
    link = 0.0
    for unit in units:
        kind = unit["target"].strip().replace('"', "").split()[-1] if unit["target"].strip() else "lib"
        label = f"{unit['name']} {kind}"
        sections = dict(unit["sections"] or [])
        front = sections.get("frontend")
        gen = sections.get("codegen")
        front_s = f"{front['end'] - front['start']:.2f}" if front else "link"
        gen_s = f"{gen['end'] - gen['start']:.2f}" if gen else "-"
        if not unit["sections"]:
            link += unit["duration"]
        total = max(total, unit["start"] + unit["duration"])
        print(f"{label:<24}{unit['start']:>7.2f}{unit['duration']:>7.2f}{front_s:>10}{gen_s:>9}")

    print(f"\nwall clock of the slowest chain: {total:.2f} s")
    print(f"units without frontend/codegen sections (link): {link:.2f} s "
          f"= {100 * link / total:.1f} % of the build")


if __name__ == "__main__":
    main()
