"""getaddrinfo from Python, for names answered on this machine.

usage:
  p08_gai.py show NAME...         the answers of socket.getaddrinfo in their order
  p08_gai.py time COUNT NAME...   the first call and COUNT more calls for each name
  p08_gai.py asyncio              loop.getaddrinfo("localhost"), prints the process id first
  p08_gai.py connect PORT         create_connection(("localhost", PORT)) to a server on 127.0.0.1 only
  p08_gai.py connecttime PORT N   3 rounds of N create_connection calls to "localhost" and to "127.0.0.1"
The name @hostname means the name of this machine, printed as "the hostname".
"""

import asyncio
import os
import socket
import statistics
import sys
import time

from tcplab import HOST, listen


def real_name(name):
    return socket.gethostname() if name == "@hostname" else name


def label(name):
    return "the hostname" if name == "@hostname" else name


def lookup(name):
    return socket.getaddrinfo(real_name(name), 21080, type=socket.SOCK_STREAM)


def show(names):
    for name in names:
        print(f"{label(name)}: " + " ".join(info[4][0] for info in lookup(name)))


def time_names(count, names):
    for name in names:
        t0 = time.perf_counter()
        lookup(name)
        first = (time.perf_counter() - t0) * 1e6
        times = []
        for _ in range(count):
            t0 = time.perf_counter()
            lookup(name)
            times.append((time.perf_counter() - t0) * 1e6)
        times.sort()
        print(f"{label(name):22} first call {first:8.1f} us, then {count} calls: median {statistics.median(times):6.1f} us, "
              f"p99 {times[count * 99 // 100]:6.1f} us, max {times[-1]:7.1f} us")


async def resolve_in_loop():
    loop = asyncio.get_running_loop()
    infos = await loop.getaddrinfo("localhost", 21080, type=socket.SOCK_STREAM)
    print("asyncio answers:", " ".join(info[4][0] for info in infos))


def connect(port):
    ls = listen(port, 8)
    t0 = time.perf_counter()
    c = socket.create_connection(("localhost", port))
    elapsed = (time.perf_counter() - t0) * 1e6
    print(f"server on {HOST}:{port} only, create_connection(('localhost', {port})) connected "
          f"from {c.getsockname()[0]} in {elapsed:.1f} us")
    c.close()
    ls.close()


def connect_time(port, count):
    ls = listen(port, count + 8)
    for rnd in (1, 2, 3):
        for name in ("localhost", "127.0.0.1"):
            socket.create_connection((name, port)).close()
            ls.accept()[0].close()
            times = []
            for _ in range(count):
                t0 = time.perf_counter()
                c = socket.create_connection((name, port))
                times.append((time.perf_counter() - t0) * 1e6)
                c.close()
                ls.accept()[0].close()
            print(f"round {rnd}: create_connection(({name!r}, {port})): median {statistics.median(times):.1f} us "
                  f"over {count} calls")
    ls.close()


mode = sys.argv[1]
if mode == "show":
    show(sys.argv[2:])
elif mode == "time":
    time_names(int(sys.argv[2]), sys.argv[3:])
elif mode == "asyncio":
    print(f"process id {os.getpid()}", flush=True)
    asyncio.run(resolve_in_loop())
elif mode == "connect":
    connect(int(sys.argv[2]))
elif mode == "connecttime":
    connect_time(int(sys.argv[2]), int(sys.argv[3]))
