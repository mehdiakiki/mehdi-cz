"""Small helpers shared by the programs of this fixture."""

import socket
import statistics
import subprocess

HOST = "127.0.0.1"


def ss(*args):
    """Run ss with the given arguments and return its output."""
    return subprocess.run(["ss", *args], capture_output=True, text=True, check=True).stdout


def on_port(port):
    """An ss filter for the sockets that use this port on either side."""
    return f"( sport = :{port} or dport = :{port} )"


def counters(*names):
    """Read TCP counters from /proc/net/snmp and /proc/net/netstat, with nstat names."""
    values = {}
    for path in ("/proc/net/snmp", "/proc/net/netstat"):
        with open(path) as f:
            lines = f.read().splitlines()
        for head, data in zip(lines[::2], lines[1::2]):
            prefix, keys = head.split(":", 1)
            nums = data.split(":", 1)[1]
            for key, num in zip(keys.split(), nums.split()):
                values[prefix + key] = int(num)
    return {name: values[name] for name in names}


def print_delta(before, after):
    """Print how much each counter grew. The counters are for the whole machine."""
    for name in before:
        print(f"  {name:28} +{after[name] - before[name]}")


def load():
    with open("/proc/loadavg") as f:
        return "load average " + " ".join(f.read().split()[:3])


def summary(label, seconds, unit="us"):
    """Print min, percentiles and max of a list of durations given in seconds."""
    scale = {"us": 1e6, "ms": 1e3}[unit]
    v = sorted(s * scale for s in seconds)

    def pct(p):
        return v[min(len(v) - 1, int(p * len(v)))]

    print(
        f"{label}: n={len(v)} min={v[0]:.1f} p10={pct(0.10):.1f} median={statistics.median(v):.1f} "
        f"p90={pct(0.90):.1f} p99={pct(0.99):.1f} max={v[-1]:.1f} {unit}"
    )


def listen(port, backlog, reuse=True):
    s = socket.socket()
    if reuse:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, port))
    s.listen(backlog)
    return s
