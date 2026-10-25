"""What close() and shutdown() send, and what the other side sees.

usage:
  p06_close.py normal PORT      the client closes, then the server reads and closes
  p06_close.py unread PORT      the client closes while data from the server is still unread
  p06_close.py linger PORT      the client closes with SO_LINGER on and a timeout of 0
  p06_close.py halfclose PORT   the client calls shutdown(SHUT_WR), the server still answers
  p06_close.py closed PORT      the server closes, then the client writes two times
  p06_close.py leak PORT COUNT  a server that never closes the connections that clients close
Each case runs once with its output, then 20 times more on PORT + 100 for the counters.
"""

import contextlib
import io
import os
import socket
import struct
import sys
import time

from tcplab import HOST, counters, listen, on_port, print_delta, ss

COUNTERS = ("TcpOutRsts", "TcpEstabResets", "TcpExtTCPAbortOnClose", "TcpExtTCPAbortOnData")


def pair(port):
    ls = listen(port, 1)
    c = socket.create_connection((HOST, port))
    s, _ = ls.accept()
    ls.close()
    return c, s


def states(port, label):
    print(f"-- ss {label}")
    for line in ss("-tanoH", on_port(port)).splitlines():
        print(f"   {line.strip()}")


def attempt(label, call):
    try:
        print(f"{label} -> {call()!r}")
    except OSError as e:
        print(f"{label} -> {e!r}")


def normal(port):
    c, s = pair(port)
    c.close()
    print("client: close()")
    time.sleep(0.1)
    attempt("server: recv(100)", lambda: s.recv(100))
    states(port, "after the client close")
    s.close()
    print("server: close()")
    time.sleep(0.1)
    states(port, "after the server close")


def unread(port):
    c, s = pair(port)
    s.sendall(b"data that the client never reads")
    time.sleep(0.1)
    c.close()
    print("client: close() with 32 unread bytes in its receive buffer")
    time.sleep(0.1)
    attempt("server: recv(100)", lambda: s.recv(100))
    states(port, "after the close")
    s.close()


def linger(port):
    c, s = pair(port)
    c.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack("ii", 1, 0))
    c.close()
    print("client: close() with SO_LINGER on, timeout 0")
    time.sleep(0.1)
    attempt("server: recv(100)", lambda: s.recv(100))
    states(port, "after the close")
    s.close()


def halfclose(port):
    c, s = pair(port)
    c.sendall(b"request")
    c.shutdown(socket.SHUT_WR)
    print("client: sendall(b'request'), then shutdown(SHUT_WR)")
    time.sleep(0.1)
    attempt("server: recv(100)", lambda: s.recv(100))
    attempt("server: recv(100)", lambda: s.recv(100))
    states(port, "after the shutdown")
    attempt("server: sendall(b'answer')", lambda: s.sendall(b"answer"))
    time.sleep(0.1)
    attempt("client: recv(100)", lambda: c.recv(100))
    s.close()
    time.sleep(0.1)
    attempt("client: recv(100)", lambda: c.recv(100))
    c.close()


def closed(port):
    c, s = pair(port)
    s.close()
    print("server: close()")
    time.sleep(0.1)
    states(port, "after the server close")
    attempt("client: send(b'first')", lambda: c.send(b"first"))
    time.sleep(0.1)
    states(port, "after the first send")
    attempt("client: send(b'second')", lambda: c.send(b"second"))
    attempt("client: recv(100)", lambda: c.recv(100))
    c.close()


def leak(port, count):
    ls = listen(port, count)
    kept = []
    for _ in range(count):
        c = socket.create_connection((HOST, port))
        conn, _ = ls.accept()
        kept.append(conn)
        c.close()
    print(f"{count} clients connected and closed, the server keeps every socket open")
    t0 = time.perf_counter()
    for at in (0.5, 10, 30, 65):
        time.sleep(at - (time.perf_counter() - t0))
        by_state, example = {}, {}
        for line in ss("-tanoH", on_port(port)).splitlines():
            state = line.split()[0]
            by_state[state] = by_state.get(state, 0) + 1
            example.setdefault(state, line.strip())
        fds = len(os.listdir("/proc/self/fd"))
        print(f"  t={at:4.1f} s  {by_state}, open file descriptors of this process: {fds}")
        for state in ("CLOSE-WAIT", "FIN-WAIT-2"):
            if at == 0.5 and state in example:
                print(f"    {example[state]}")
    for conn in kept:
        conn.close()
    time.sleep(0.2)
    by_state = {}
    for line in ss("-tanH", on_port(port)).splitlines():
        by_state[line.split()[0]] = by_state.get(line.split()[0], 0) + 1
    print(f"  after the server closes them: {by_state}")
    ls.close()


CASES = {"normal": normal, "unread": unread, "linger": linger, "halfclose": halfclose, "closed": closed}

mode, port = sys.argv[1], int(sys.argv[2])
if mode == "leak":
    leak(port, int(sys.argv[3]))
else:
    CASES[mode](port)
    before = counters(*COUNTERS)
    with contextlib.redirect_stdout(io.StringIO()):
        for _ in range(20):
            CASES[mode](port + 100)
    print("-- the same case 20 times, counters of the whole machine:")
    print_delta(before, counters(*COUNTERS))
