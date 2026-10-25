"""Run the two-file update under the crash simulator: config and data must always have the same version."""

import os
import posixpath
import shutil
import subprocess
import sys

import crashsim


def content(version):
    return f"version={version}\n".encode(), f"data for version {version}\n".encode() * 200


def base_of(state, layout):
    if layout == "separate":
        return ""
    if layout == "exchange":
        return "live"
    link = state.get("current")
    return link[1] if link and link[0] == "symlink" else None


def versions(state, layout):
    base = base_of(state, layout)
    if base is None:
        return None
    found = []
    for index, name in enumerate(("config", "data")):
        entry = state.get(posixpath.join(base, name))
        if not entry or entry[0] != "file":
            return None
        match = [v for v in (1, 2) if content(v)[index] == entry[1]]
        found.append(match[0] if match else None)
    return tuple(found)


def make_check(layout):
    def check(state, acks):
        found = versions(state, layout)
        if found is None or None in found:
            return "a file is missing or has unknown content"
        if found[0] != found[1]:
            return f"mixed: config at version {found[0]}, data at version {found[1]}"
        if any(a.strip() == "saved" for a in acks) and found[0] != 2:
            return "the program printed saved, but the files are still at version 1"
        return None
    return check


def describe(layout):
    def show(state):
        found = versions(state, layout)
        names = ", ".join(sorted(p for p in state if "/" not in p))
        return [f"top level: {names}", f"versions seen through the layout (config, data): {found}"]
    return show


def main(twofiles, out):
    print(crashsim.__doc__.strip())
    print()
    titles = {
        "separate": "two files, each one replaced with temp file, fsync, rename and directory fsync",
        "symlink": "new version directory, then a symlink current.tmp renamed over current",
        "exchange": "new version in staging/, then renameat2(staging, live, RENAME_EXCHANGE)",
    }
    for layout, title in titles.items():
        workdir = os.path.join(out, layout)
        shutil.rmtree(workdir, ignore_errors=True)
        subprocess.run([twofiles, "setup", workdir, layout], check=True)
        initial = crashsim.snapshot(workdir)
        trace = os.path.join(out, layout + ".trace")
        crashsim.run_traced([twofiles, layout, "."], workdir, trace)
        sim = crashsim.Simulator(crashsim.Trace(trace, workdir, initial))
        result = crashsim.check_all(sim, make_check(layout))
        crashsim.report(f"{title} (twofiles {layout})", sim, result, describe(layout))
        shutil.rmtree(workdir)
        os.remove(trace)


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]))
