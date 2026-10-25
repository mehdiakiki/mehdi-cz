"""Replay the file operations of a traced program and list the states that a crash could leave.

Model of a crash after operation k:
  process crash: every operation up to k is kept (the page cache survives).
  machine crash: the data of a file is kept up to its last fsync; later writes to it are kept
  in order, as a prefix, and the last kept write may be cut at a 4 KiB page boundary.
  Name operations (create, rename, unlink, link, symlink, mkdir) are kept in order, as a prefix;
  an fsync of a directory keeps every name operation before it that touched that directory.
"""

import itertools
import os
import posixpath
import subprocess

from stracelib import records, unquote

PAGE = 4096
SYSCALLS = ",".join([
    "open", "openat", "creat", "write", "pwrite64", "writev", "fsync", "fdatasync", "sync", "syncfs",
    "rename", "renameat", "renameat2", "unlink", "unlinkat", "rmdir", "truncate", "ftruncate",
    "close", "mkdir", "mkdirat", "link", "linkat", "symlink", "symlinkat", "lseek",
    "dup", "dup2", "dup3", "fcntl", "chdir", "clone", "clone3", "fork", "vfork",
])


def run_traced(cmd, workdir, trace):
    """Run cmd in workdir under strace; the trace file receives every relevant system call."""
    strace = ["strace", "-f", "-qq", "-xx", "-s", "16777216", "-e", "signal=none",
              "-e", "trace=" + SYSCALLS, "-o", trace]
    return subprocess.run(strace + cmd, cwd=workdir, stdout=subprocess.DEVNULL).returncode


def snapshot(workdir):
    """Read the files, directories and symlinks below workdir into a state dictionary."""
    state = {}
    for root, dirs, files in os.walk(workdir):
        for name in dirs + files:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, workdir)
            if os.path.islink(full):
                state[rel] = ("symlink", os.readlink(full))
            elif os.path.isdir(full):
                state[rel] = ("dir",)
            else:
                with open(full, "rb") as f:
                    state[rel] = ("file", f.read())
    return state


def materialize(state, directory):
    """Create the files of a state below directory, so that a real program can read them."""
    for path in sorted(state, key=lambda p: p.count("/")):
        full = os.path.join(directory, path)
        kind = state[path][0]
        if kind == "dir":
            os.makedirs(full, exist_ok=True)
        elif kind == "symlink":
            os.symlink(state[path][1], full)
        else:
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "wb") as f:
                f.write(state[path][1])


def parent(path):
    return posixpath.dirname(path) or "."


def moved(names, old, new):
    """Rename old to new in a name table, with everything below old if it is a directory."""
    result = {}
    for path, node in names.items():
        if path == old:
            result[new] = node
        elif path.startswith(old + "/"):
            result[new + path[len(old):]] = node
        elif path != new and not path.startswith(new + "/"):
            result[path] = node
    return result


def apply_meta(names, op):
    kind = op[0]
    if kind in ("create", "mkdir", "symlink"):
        names = dict(names)
        names[op[1]] = op[2]
    elif kind in ("unlink", "rmdir"):
        names = {p: n for p, n in names.items() if p != op[1] and not p.startswith(op[1] + "/")}
    elif kind == "rename":
        names = moved(names, op[1], op[2])
    elif kind == "exchange":
        a, b = op[1], op[2]
        swapped = moved(moved(names, a, a + "\0"), b, a)
        names = moved(swapped, a + "\0", b)
    elif kind == "link":
        names = dict(names)
        names[op[2]] = names[op[1]]
    return names


class Trace:
    """The file operations of one traced run, as a list of events."""

    def __init__(self, trace, workdir, initial):
        self.workdir = os.path.realpath(workdir)
        self.kinds = {}
        self.initial_data = {}
        self.names = {}
        self.targets = {}
        for node, (path, value) in enumerate(sorted(initial.items())):
            self.names[path] = node
            self.kinds[node] = value[0]
            if value[0] == "file":
                self.initial_data[node] = value[1]
            elif value[0] == "symlink":
                self.targets[node] = value[1]
        self.initial_names = dict(self.names)
        self.data = dict(self.initial_data)
        self.events = []
        self.tables = {}
        self.cwd = {}
        self._replay(trace)

    def _new_node(self, kind):
        node = len(self.kinds)
        self.kinds[node] = kind
        if kind == "file":
            self.data[node] = b""
        return node

    def _resolve(self, pid, path, dirfd=None):
        """Turn a path argument into a path relative to workdir, or None when it is outside."""
        if path.startswith("/"):
            full = path
        else:
            if dirfd is not None and dirfd != "AT_FDCWD":
                entry = self.tables[pid].get(dirfd)
                if not entry or entry["path"] is None:
                    return None
                base = posixpath.join(self.workdir, entry["path"])
            else:
                base = self.cwd.get(pid, self.workdir)
            full = posixpath.join(base, path)
        full = posixpath.normpath(full)
        if full == self.workdir:
            return "."
        if not full.startswith(self.workdir + "/"):
            return None
        rel = full[len(self.workdir) + 1:]
        parts, resolved = rel.split("/"), []
        for i, part in enumerate(parts):
            candidate = "/".join(resolved + [part])
            node = self.names.get(candidate)
            if node is not None and self.kinds[node] == "symlink" and i < len(parts) - 1:
                target = self.targets[node]
                resolved = posixpath.normpath(posixpath.join("/".join(resolved), target)).split("/")
            else:
                resolved.append(part)
        return posixpath.normpath("/".join(resolved))

    def _add(self, kind, desc, **fields):
        fields.update(kind=kind, desc=desc, index=len(self.events))
        self.events.append(fields)

    def _meta(self, op, desc, dirs):
        self.names = apply_meta(self.names, op)
        self._add("meta", desc, op=op, dirs=set(dirs))

    def _data(self, node, path, new, write=None, desc=""):
        before = self.data[node]
        self.data[node] = new
        self._add("data", desc, node=node, path=path, before=before, after=new, write=write)

    def _prescan(self, trace):
        children = {}
        for pid, name, args, result, error in records(trace):
            if name in ("clone", "clone3", "fork", "vfork") and not error and result not in ("0", "?"):
                children[result] = (pid, "CLONE_FILES" in " ".join(args))
        return children

    def _table(self, pid, children):
        if pid not in self.tables:
            if pid in children and children[pid][0] in self.tables:
                parent_pid, shared = children[pid]
                table = self.tables[parent_pid]
                self.tables[pid] = table if shared else dict(table)
                self.cwd[pid] = self.cwd.get(parent_pid, self.workdir)
            else:
                self.tables[pid] = {}
        return self.tables[pid]

    def _open(self, pid, table, path, flags, result):
        if path is None:
            table[result] = {"node": None, "path": None, "offset": 0, "append": False}
            return
        node = self.names.get(path)
        if node is None and "O_CREAT" in flags:
            node = self._new_node("file")
            self._meta(("create", path, node), f"create {path}", [parent(path)])
        if node is None and path == ".":
            node = "root"
        if node is not None and node != "root" and self.kinds[node] == "file" and "O_TRUNC" in flags and self.data[node]:
            self._data(node, path, b"", desc=f"truncate {path} to 0 bytes (O_TRUNC)")
        table[result] = {"node": node, "path": path, "offset": 0, "append": "O_APPEND" in flags}

    def _write(self, entry, data, offset=None):
        node = entry["node"]
        old = self.data[node]
        if offset is None:
            offset = len(old) if entry["append"] else entry["offset"]
            entry["offset"] = offset + len(data)
        new = old[:offset].ljust(offset, b"\0") + data + old[offset + len(data):]
        self._data(node, entry["path"], new, write=(offset, data),
                   desc=f"write {len(data)} bytes at offset {offset} to {entry['path']}")

    def _replay(self, trace):
        children = self._prescan(trace)
        for pid, name, args, result, error in records(trace):
            if error or result == "?":
                continue
            table = self._table(pid, children)
            if name in ("open", "openat", "creat"):
                if name == "openat":
                    path, flags = self._resolve(pid, unquote(args[1]).decode(), args[0]), args[2]
                else:
                    path = self._resolve(pid, unquote(args[0]).decode())
                    flags = args[1] if name == "open" else "O_CREAT|O_WRONLY|O_TRUNC"
                self._open(pid, table, path, flags, result)
            elif name in ("write", "pwrite64", "writev"):
                fd = args[0]
                if name == "writev":
                    parts = [unquote(a.split("=", 1)[1]) for a in args[1].strip("[]").split(", ") if a.startswith("{iov_base=") or a.startswith("iov_base=")]
                    data = b"".join(parts)[:int(result)]
                else:
                    data = unquote(args[1])[:int(result)]
                if fd not in table:
                    if fd == "1":
                        self._add("ack", f"stdout: {data.decode(errors='replace').strip()}", text=data.decode(errors="replace"))
                    continue
                entry = table[fd]
                if entry["node"] is None or entry["node"] == "root" or self.kinds[entry["node"]] != "file":
                    continue
                self._write(entry, data, int(args[3]) if name == "pwrite64" else None)
            elif name in ("fsync", "fdatasync"):
                entry = table.get(args[0])
                if not entry or entry["node"] is None:
                    continue
                node = entry["node"]
                if node == "root" or self.kinds[node] == "dir":
                    self._add("dirsync", f"{name} directory {entry['path']}", dir=entry["path"])
                else:
                    self._add("sync", f"{name} {entry['path']}", node=node)
            elif name in ("sync", "syncfs"):
                self._add("syncall", name)
            elif name in ("rename", "renameat", "renameat2"):
                if name == "rename":
                    a, b = self._resolve(pid, unquote(args[0]).decode()), self._resolve(pid, unquote(args[1]).decode())
                    flags = "0"
                else:
                    a = self._resolve(pid, unquote(args[1]).decode(), args[0])
                    b = self._resolve(pid, unquote(args[3]).decode(), args[2])
                    flags = args[4] if name == "renameat2" else "0"
                if a is None or b is None:
                    continue
                if "RENAME_EXCHANGE" in flags:
                    self._meta(("exchange", a, b), f"exchange {a} and {b}", [parent(a), parent(b)])
                else:
                    self._meta(("rename", a, b), f"rename {a} -> {b}", [parent(a), parent(b)])
            elif name in ("unlink", "unlinkat", "rmdir"):
                if name == "unlinkat":
                    path = self._resolve(pid, unquote(args[1]).decode(), args[0])
                    kind = "rmdir" if "AT_REMOVEDIR" in args[2] else "unlink"
                else:
                    path, kind = self._resolve(pid, unquote(args[0]).decode()), "rmdir" if name == "rmdir" else "unlink"
                if path is not None:
                    self._meta((kind, path), f"{kind} {path}", [parent(path)])
            elif name in ("mkdir", "mkdirat"):
                raw = args[1] if name == "mkdirat" else args[0]
                path = self._resolve(pid, unquote(raw).decode(), args[0] if name == "mkdirat" else None)
                if path is not None:
                    self._meta(("mkdir", path, self._new_node("dir")), f"mkdir {path}", [parent(path)])
            elif name in ("link", "linkat"):
                if name == "link":
                    a, b = self._resolve(pid, unquote(args[0]).decode()), self._resolve(pid, unquote(args[1]).decode())
                else:
                    a = self._resolve(pid, unquote(args[1]).decode(), args[0])
                    b = self._resolve(pid, unquote(args[3]).decode(), args[2])
                if a is not None and b is not None:
                    self._meta(("link", a, b), f"link {a} -> {b}", [parent(b)])
            elif name in ("symlink", "symlinkat"):
                target = unquote(args[0]).decode()
                raw = args[2] if name == "symlinkat" else args[1]
                path = self._resolve(pid, unquote(raw).decode(), args[1] if name == "symlinkat" else None)
                if path is not None:
                    node = self._new_node("symlink")
                    self.targets[node] = target
                    self._meta(("symlink", path, node), f"symlink {path} -> {target}", [parent(path)])
            elif name in ("truncate", "ftruncate"):
                if name == "truncate":
                    path = self._resolve(pid, unquote(args[0]).decode())
                    node = self.names.get(path)
                else:
                    entry = table.get(args[0])
                    node, path = (entry["node"], entry["path"]) if entry else (None, None)
                if node is not None and node != "root" and self.kinds[node] == "file":
                    length = int(args[1])
                    new = self.data[node][:length].ljust(length, b"\0")
                    self._data(node, path, new, desc=f"truncate {path} to {length} bytes")
            elif name == "lseek":
                if args[0] in table:
                    table[args[0]]["offset"] = int(result)
            elif name in ("dup", "dup2", "dup3") or (name == "fcntl" and "F_DUPFD" in args[1]):
                if args[0] in table:
                    table[result] = table[args[0]]
            elif name == "close":
                table.pop(args[0], None)
            elif name == "chdir":
                path = self._resolve(pid, unquote(args[0]).decode())
                if path is not None:
                    self.cwd[pid] = posixpath.join(self.workdir, path)


class Simulator:
    """Enumerate the states that a crash after each operation could leave on the disk."""

    def __init__(self, trace):
        self.t = trace
        self.events = trace.events

    def _meta_ops(self, k):
        return [e for e in self.events[:k] if e["kind"] == "meta"]

    def _durable_meta(self, k):
        metas = self._meta_ops(k)
        durable = 0
        for e in self.events[:k]:
            if e["kind"] == "syncall":
                durable = max(durable, sum(1 for m in metas if m["index"] < e["index"]))
            if e["kind"] == "dirsync":
                for position, m in enumerate(metas):
                    if m["index"] < e["index"] and e["dir"] in m["dirs"]:
                        durable = max(durable, position + 1)
        return durable

    def _choices(self, node, k):
        """The possible contents of one file after a machine crash after k events."""
        events = self.events[:k]
        last_sync = max([e["index"] for e in events
                         if (e["kind"] == "sync" and e["node"] == node) or e["kind"] == "syncall"], default=-1)
        writes = [e for e in events if e["kind"] == "data" and e["node"] == node]
        base = self.t.initial_data.get(node, b"")
        for e in writes:
            if e["index"] < last_sync:
                base = e["after"]
        pending = [e for e in writes if e["index"] > last_sync]
        if last_sync >= 0:
            label = "content of its last fsync"
        elif node in self.t.initial_data:
            label = "content from before the run"
        else:
            label = "new file, no data"
        choices = [(base, f"{label}, 0 of {len(pending)} unsynced writes kept")]
        for position, e in enumerate(pending, 1):
            if e["write"]:
                offset, data = e["write"]
                first, last = offset // PAGE, (offset + len(data) - 1) // PAGE
                for pages in range(1, last - first + 1):
                    end = min(offset + len(data), (first + pages) * PAGE)
                    cut = e["before"][:offset].ljust(offset, b"\0") + data[:end - offset] + e["before"][end:]
                    choices.append((cut, f"{position - 1} of {len(pending)} unsynced writes kept, then {pages} pages of the next"))
            choices.append((e["after"], f"{position} of {len(pending)} unsynced writes kept"))
        return choices

    def process_state(self, k):
        names = dict(self.t.initial_names)
        data = dict(self.t.initial_data)
        for e in self.events[:k]:
            if e["kind"] == "meta":
                names = apply_meta(names, e["op"])
            elif e["kind"] == "data":
                data[e["node"]] = e["after"]
        return self._state(names, lambda node: data.get(node, b""))

    def _state(self, names, content):
        state = {}
        for path, node in names.items():
            kind = self.t.kinds[node]
            if kind == "file":
                state[path] = ("file", content(node))
            elif kind == "symlink":
                state[path] = ("symlink", self.t.targets[node])
            else:
                state[path] = ("dir",)
        return state

    def machine_states(self, k):
        """Yield (state, explanation) for every distinct state a machine crash after k events can leave."""
        metas = self._meta_ops(k)
        seen = set()
        for kept in range(self._durable_meta(k), len(metas) + 1):
            names = dict(self.t.initial_names)
            for m in metas[:kept]:
                names = apply_meta(names, m["op"])
            files = sorted({n for n in names.values() if self.t.kinds[n] == "file"})
            options = [self._choices(n, k) for n in files]
            for combo in itertools.product(*options):
                contents = {n: c[0] for n, c in zip(files, combo)}
                state = self._state(names, lambda node: contents[node])
                key = tuple(sorted((p, v[0], v[1] if len(v) > 1 else None) for p, v in state.items()))
                if key in seen:
                    continue
                seen.add(key)
                notes = [f"{kept} of {len(metas)} name operations kept"]
                notes += [f"{p}: {c[1]}" for n, c in zip(files, combo) for p, x in names.items() if x == n]
                yield state, notes

    def acks(self, k):
        return [e["text"] for e in self.events[:k] if e["kind"] == "ack"]


def check_all(sim, check):
    """Run the checker on every crash state. Returns counts and the first bad machine state."""
    points = len(sim.events) + 1
    result = {"points": points, "process": 0, "process_bad": 0, "machine": 0, "machine_bad": 0,
              "distinct": set(), "distinct_bad": set(), "first_bad": None, "first_bad_process": None}
    for k in range(points):
        acks = sim.acks(k)
        problem = check(sim.process_state(k), acks)
        result["process"] += 1
        if problem:
            result["process_bad"] += 1
            if result["first_bad_process"] is None:
                result["first_bad_process"] = (k, problem)
        for state, notes in sim.machine_states(k):
            key = tuple(sorted((p, v[0], v[1] if len(v) > 1 else None) for p, v in state.items()))
            result["machine"] += 1
            result["distinct"].add(key)
            problem = check(state, acks)
            if problem:
                result["machine_bad"] += 1
                result["distinct_bad"].add(key)
                if result["first_bad"] is None:
                    result["first_bad"] = (k, state, notes, problem, acks)
    return result


def report(title, sim, result, describe):
    counts = {}
    for e in sim.events:
        counts[e["kind"]] = counts.get(e["kind"], 0) + 1
    print(f"== {title}")
    print(f"  events: {len(sim.events)} ({', '.join(f'{v} {k}' for k, v in sorted(counts.items()))})")
    print(f"  crash points: {result['points']}")
    print(f"  process crash: {result['process']} states, {result['process_bad']} bad")
    print(f"  machine crash: {result['machine']} states ({len(result['distinct'])} distinct), "
          f"{result['machine_bad']} bad ({len(result['distinct_bad'])} distinct)")
    if result["first_bad_process"]:
        k, problem = result["first_bad_process"]
        last = sim.events[k - 1]["desc"] if k else "nothing yet"
        print(f"  first bad process state: crash after event {k} of {len(sim.events)} ({last}): {problem}")
    if result["first_bad"]:
        k, state, notes, problem, acks = result["first_bad"]
        last = sim.events[k - 1]["desc"] if k else "nothing yet"
        print(f"  first bad machine state: crash after event {k} of {len(sim.events)} ({last})")
        print(f"    promises printed before the crash: {acks if acks else 'none'}")
        for note in notes:
            print(f"    model: {note}")
        for line in describe(state):
            print(f"    on disk: {line}")
        print(f"    checker: {problem}")
