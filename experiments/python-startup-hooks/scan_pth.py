#!/usr/bin/env python3
import glob
import os
import site
import sys

HOME = os.path.expanduser("~")


def redact(text):
    return text.replace(HOME, "DIR")


def site_dirs():
    dirs = list(site.getsitepackages())
    user = site.getusersitepackages()
    if user:
        dirs.append(user)
    seen = []
    for d in dirs:
        if d not in seen:
            seen.append(d)
    return seen


def scan():
    print("python: %s" % sys.version.split()[0])
    for d in site_dirs():
        exists = os.path.isdir(d)
        print("\nsite-packages: %s (%s)" % (redact(d), "present" if exists else "absent"))
        if not exists:
            continue
        pth_files = sorted(glob.glob(os.path.join(d, "*.pth")))
        start_files = sorted(glob.glob(os.path.join(d, "*.start")))
        print("  .pth files: %d, .start files: %d" % (len(pth_files), len(start_files)))
        for pth in pth_files:
            try:
                with open(pth, "r", encoding="utf-8", errors="replace") as fh:
                    lines = fh.read().splitlines()
            except OSError:
                continue
            imports = [ln for ln in lines
                       if ln.lstrip().startswith(("import ", "import\t"))]
            if imports:
                print("  EXEC %s" % redact(os.path.basename(pth)))
                for ln in imports:
                    print("       %s" % redact(ln.strip()))
        for start in start_files:
            print("  START %s" % redact(os.path.basename(start)))
        for name in ("sitecustomize.py", "usercustomize.py"):
            if os.path.isfile(os.path.join(d, name)):
                print("  CUSTOMIZE %s" % name)


if __name__ == "__main__":
    scan()
