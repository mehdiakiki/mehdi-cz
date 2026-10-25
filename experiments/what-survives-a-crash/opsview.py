"""Print the file operations of an strace -f log on files below one directory, one line per operation.

With --stdout, writes to file descriptor 1 are printed too."""

import os
import sys

from stracelib import records, unquote

SYNCS = {"fsync", "fdatasync", "sync_file_range"}


def main(trace, workdir, stdout):
    workdir = os.path.realpath(workdir)
    fds, out, syncs = {}, [], 0

    def show(path):
        full = os.path.normpath(os.path.join(workdir, path))
        if full != workdir and not full.startswith(workdir + os.sep):
            return None
        return os.path.relpath(full, workdir) + ("/" if os.path.isdir(full) or full == workdir else "")

    def path_arg(args, index, dirfd_index=None):
        path = unquote(args[index]).decode()
        if dirfd_index is not None and args[dirfd_index] != "AT_FDCWD":
            return None
        return show(path)

    for pid, name, args, result, error in records(trace):
        if error:
            continue
        line = None
        if name in ("open", "openat", "creat"):
            index = 1 if name == "openat" else 0
            path = path_arg(args, index, 0 if name == "openat" else None)
            flags = args[index + 1] if name != "creat" else "O_CREAT|O_WRONLY|O_TRUNC"
            if path is not None:
                fds[(pid, result)] = path
                kept = [f for f in flags.split("|") if f in ("O_WRONLY", "O_RDWR", "O_CREAT", "O_EXCL", "O_TRUNC", "O_APPEND")]
                line = f"open      {path} ({'|'.join(kept)})" if kept else None
        elif stdout and name == "write" and args[0] == "1" and (pid, "1") not in fds:
            line = f"write     {result} bytes to stdout: {unquote(args[1]).decode(errors='replace').strip()}"
        elif name in ("write", "pwrite64", "writev") and (pid, args[0]) in fds:
            where = f" at offset {args[3]}" if name == "pwrite64" else ""
            line = f"{name:<9} {result} bytes{where} to {fds[(pid, args[0])]}"
        elif name == "copy_file_range" and (pid, args[2]) in fds:
            line = f"copy      {result} bytes from {fds.get((pid, args[0]), '?')} to {fds[(pid, args[2])]}"
        elif name in SYNCS and (pid, args[0]) in fds:
            syncs += 1
            line = f"{name:<9} {fds[(pid, args[0])]}"
        elif name in ("rename", "link", "symlink"):
            a, b = unquote(args[0]).decode(), path_arg(args, 1)
            line = f"{name:<9} {show(a) or a} -> {b}" if b else None
        elif name in ("renameat", "renameat2", "linkat"):
            a, b = path_arg(args, 1, 0), path_arg(args, 3, 2)
            extra = f" ({args[4]})" if name == "renameat2" and args[4] != "0" else ""
            line = f"{name:<9} {a} -> {b}{extra}" if b else None
        elif name in ("unlink", "unlinkat"):
            path = path_arg(args, 0) if name == "unlink" else path_arg(args, 1, 0)
            line = f"unlink    {path}" if path else None
        elif name in ("fchown", "fchmod") and (pid, args[0]) in fds:
            line = f"{name:<9} {fds[(pid, args[0])]} ({', '.join(args[1:])})"
        elif name in ("ftruncate",) and (pid, args[0]) in fds:
            line = f"ftruncate {fds[(pid, args[0])]} to {args[1]} bytes"
        elif name == "close":
            fds.pop((pid, args[0]), None)
        if line:
            out.append(line)
    for line in out:
        print("  " + line)
    print(f"  fsync, fdatasync or sync_file_range calls: {syncs}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], "--stdout" in sys.argv[3:])
