"""Clients that call connect() to a listener on 127.0.0.1.

usage:
  p01_client.py connect PORT            one blocking connect, then ss, then close
  p01_client.py timeout PORT SECONDS    one connect with a timeout, through socket.create_connection
  p01_client.py time PORT COUNT         COUNT blocking connects, timing summary and counters;
                                        after each connect it waits until the server closes
  p01_client.py abandon PORT SECONDS    connect with a timeout, keep the socket after the timeout
  p01_client.py synretry PORT SYNCNT    connect with TCP_SYNCNT (0 keeps the system default) to a full
                                        listener and print every SYN retry that ss shows
"""

import socket
import sys
import threading
import time

from tcplab import HOST, counters, load, on_port, print_delta, ss, summary


def connect_once(port):
    s = socket.socket()
    try:
        s.connect((HOST, port))
        print(ss("-tan", on_port(port)), end="", flush=True)
    except OSError as e:
        print(f"connect: {e!r}")
    s.close()


def connect_timeout(port, seconds):
    t0 = time.perf_counter()
    try:
        s = socket.create_connection((HOST, port), timeout=seconds)
        s.close()
        print(f"create_connection: connected after {time.perf_counter() - t0:.6f} s")
    except OSError as e:
        print(f"create_connection: {e!r} after {time.perf_counter() - t0:.3f} s")


def time_connects(port, count):
    names = ("TcpActiveOpens", "TcpAttemptFails", "TcpOutRsts", "TcpEstabResets")
    before = counters(*names)
    durations, errors = [], {}
    for _ in range(count):
        s = socket.socket()
        t0 = time.perf_counter()
        try:
            s.connect((HOST, port))
            durations.append(time.perf_counter() - t0)
            s.recv(1)
        except OSError as e:
            durations.append(time.perf_counter() - t0)
            errors[repr(e)] = errors.get(repr(e), 0) + 1
        s.close()
    after = counters(*names)
    print(f"{count} connects to {HOST}:{port}, {load()}")
    summary("connect()", durations)
    for err, n in errors.items():
        print(f"  {n} x {err}")
    print_delta(before, after)


def abandon(port, seconds):
    s = socket.socket()
    s.settimeout(seconds)
    t0 = time.perf_counter()
    try:
        s.connect((HOST, port))
    except TimeoutError as e:
        print(f"connect: {e!r} after {time.perf_counter() - t0:.3f} s")
    print("-- ss after the timeout, the socket is still open")
    print(ss("-tano", "state", "syn-sent", f"dport = :{port}"), end="")
    s.close()
    print("-- ss after close()")
    print(ss("-tano", "state", "syn-sent", f"dport = :{port}"), end="")


def watch_syn_sent(port, t0, done):
    """Print the ss timer of the SYN-SENT socket each time its retransmit count changes."""
    last = None
    while not done.is_set():
        out = ss("-tnoH", "state", "syn-sent", f"dport = :{port}").strip()
        if "timer:" in out:
            timer = out.split("timer:")[1]
            retrans = timer.rstrip(")").split(",")[-1]
            if retrans != last:
                print(f"  t={time.perf_counter() - t0:8.3f} s  timer:{timer}", flush=True)
                last = retrans
        time.sleep(0.02)


def synretry(port, syncnt):
    names = ("TcpExtListenOverflows", "TcpExtListenDrops", "TcpExtTCPSynRetrans", "TcpAttemptFails")
    print(ss("-tln", f"sport = :{port}"), end="")
    s = socket.socket()
    if syncnt:
        s.setsockopt(socket.IPPROTO_TCP, socket.TCP_SYNCNT, syncnt)
    print(f"TCP_SYNCNT of the socket: {s.getsockopt(socket.IPPROTO_TCP, socket.TCP_SYNCNT)}, {load()}")
    before = counters(*names)
    done = threading.Event()
    t0 = time.perf_counter()
    watcher = threading.Thread(target=watch_syn_sent, args=(port, t0, done))
    watcher.start()
    try:
        s.connect((HOST, port))
        print(f"connect: returned 0 after {time.perf_counter() - t0:.3f} s")
    except OSError as e:
        print(f"connect: {e!r} after {time.perf_counter() - t0:.3f} s")
    done.set()
    watcher.join()
    after = counters(*names)
    print_delta(before, after)
    s.close()


mode, port = sys.argv[1], int(sys.argv[2])
if mode == "connect":
    connect_once(port)
elif mode == "timeout":
    connect_timeout(port, float(sys.argv[3]))
elif mode == "time":
    time_connects(port, int(sys.argv[3]))
elif mode == "abandon":
    abandon(port, float(sys.argv[3]))
elif mode == "synretry":
    synretry(port, int(sys.argv[3]))
