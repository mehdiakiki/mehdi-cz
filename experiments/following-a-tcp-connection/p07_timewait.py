"""TIME_WAIT, FIN-WAIT-2 timeouts, local ports and SO_REUSEADDR.

usage:
  p07_timewait.py sides PORT_A PORT_B COUNT  COUNT connections where the client closes first (PORT_A)
                                             and COUNT where the server closes first (PORT_B),
                                             then the TIME-WAIT sockets every 5 s
  p07_timewait.py finwait PORT               TCP_LINGER2 of 5 s on orphaned FIN-WAIT-2 and on TIME-WAIT
  p07_timewait.py ports PORT LOW             20 local ports LOW to LOW+19 per socket (IP_LOCAL_PORT_RANGE):
                                             connect(), bind() then connect(), and bind() with
                                             IP_BIND_ADDRESS_NO_PORT then connect()
  p07_timewait.py restart PORT               bind() of a listening port that has TIME-WAIT sockets
"""

import socket
import struct
import sys
import threading
import time

from tcplab import HOST, counters, listen, load, ss

IP_LOCAL_PORT_RANGE = 51


def count(*filters):
    return len(ss("-tanH", *filters).splitlines())


def server_loop(ls, close_first):
    """Accept connections; close at once, or wait for the client to close first."""
    while True:
        try:
            conn, _ = ls.accept()
        except OSError:
            return
        if not close_first:
            while conn.recv(100):
                pass
        conn.close()


def sides(port_a, port_b, n):
    ls_a, ls_b = listen(port_a, 128), listen(port_b, 128)
    threading.Thread(target=server_loop, args=(ls_a, False), daemon=True).start()
    threading.Thread(target=server_loop, args=(ls_b, True), daemon=True).start()
    for _ in range(n):
        socket.create_connection((HOST, port_a)).close()
    for _ in range(n):
        c = socket.create_connection((HOST, port_b))
        while c.recv(100):
            pass
        c.close()
    print(f"{n} connections to port {port_a}, the client closes first")
    print(f"{n} connections to port {port_b}, the server closes first, {load()}")
    print(ss("-tanoH", "state", "time-wait", f"dport = :{port_a}").splitlines()[0])
    print(ss("-tanoH", "state", "time-wait", f"sport = :{port_b}").splitlines()[0])
    t0 = time.perf_counter()
    for at in range(0, 70, 5):
        time.sleep(max(0, at - (time.perf_counter() - t0)))
        a_client = count("state", "time-wait", f"dport = :{port_a}")
        a_server = count("state", "time-wait", f"sport = :{port_a}")
        b_client = count("state", "time-wait", f"dport = :{port_b}")
        b_server = count("state", "time-wait", f"sport = :{port_b}")
        print(f"  t={at:2d} s  TIME-WAIT  port {port_a}: client side {a_client:4d}, server side {a_server}"
              f"   port {port_b}: client side {b_client}, server side {b_server:4d}", flush=True)
    ls_a.close()
    ls_b.close()


def watch(filters, t0, until, step):
    """Print the matching sockets with their timer until none is left or the time is up."""
    time.sleep(0.25)
    while True:
        t = time.perf_counter() - t0
        lines = ss("-tanoH", *filters).splitlines()
        print(f"  t={t:5.1f} s  " + (lines[0].strip() if lines else "no socket"), flush=True)
        if not lines or t > until:
            return
        time.sleep(step)


def finwait(port):
    ls = listen(port, 8)
    linger = struct.pack("i", 5)
    print(f"tcp_fin_timeout = {open('/proc/sys/net/ipv4/tcp_fin_timeout').read().strip()}, {load()}")
    print("-- TCP_LINGER2 5 s, the client closes, the server never closes")
    c = socket.create_connection((HOST, port))
    c.setsockopt(socket.IPPROTO_TCP, socket.TCP_LINGER2, linger)
    kept, _ = ls.accept()
    c.close()
    watch(("state", "fin-wait-2", f"dport = :{port}"), time.perf_counter(), 10, 1)
    print("-- TCP_LINGER2 5 s, the client closes, then the server closes")
    c = socket.create_connection((HOST, port))
    c.setsockopt(socket.IPPROTO_TCP, socket.TCP_LINGER2, linger)
    conn, _ = ls.accept()
    c.close()
    time.sleep(0.1)
    conn.close()
    watch(("state", "time-wait", f"dport = :{port}"), time.perf_counter(), 10, 5)
    kept.close()
    ls.close()


def ranged_socket(low):
    s = socket.socket()
    s.setsockopt(socket.IPPROTO_IP, IP_LOCAL_PORT_RANGE, struct.pack("I", (low + 19) << 16 | low))
    return s


def attempt(low, port, how):
    s = ranged_socket(low)
    try:
        if how == "bind":
            s.bind((HOST, 0))
        elif how == "bind-no-port":
            s.setsockopt(socket.IPPROTO_IP, socket.IP_BIND_ADDRESS_NO_PORT, 1)
            s.bind((HOST, 0))
        s.connect((HOST, port))
        return s.getsockname()[1], None
    except OSError as e:
        return None, e
    finally:
        s.close()


def ports(port, low):
    ls = listen(port, 128)
    threading.Thread(target=server_loop, args=(ls, False), daemon=True).start()
    print(f"local ports {low} to {low + 19} for each client socket, the client closes first, {load()}")
    for how, first in (("connect", low), ("bind", low + 100), ("bind-no-port", low + 200)):
        before = counters("TcpExtTWRecycled")
        used, errors = set(), {}
        t0 = time.perf_counter()
        first_error = recovered = None
        while time.perf_counter() - t0 < (65 if how == "bind" else 3):
            p, err = attempt(first, port, how)
            t = time.perf_counter() - t0
            if err:
                errors[repr(err)] = errors.get(repr(err), 0) + 1
                if first_error is None:
                    first_error = (len(used), repr(err), t)
                time.sleep(0.05)
            else:
                used.add(p)
                if first_error and recovered is None:
                    recovered = t
        print(f"== {how}, ports {first} to {first + 19}")
        print(f"  first error after {first_error[0]} connections: {first_error[1]} at t={first_error[2]:.3f} s")
        print(f"  first connection after it at t={recovered:.3f} s")
        for err, n in errors.items():
            print(f"  {n} x {err}")
        print(f"  distinct local ports used: {len(used)}, TIME-WAIT now: "
              f"{count('state', 'time-wait', f'dport = :{port}', f'sport >= :{first}', f'sport <= :{first + 19}')}")
        print(f"  TcpExtTWRecycled +{counters('TcpExtTWRecycled')['TcpExtTWRecycled'] - before['TcpExtTWRecycled']}")
    ls.close()


def restart(port):
    print(f"the old server accepts one connection and closes it first, then it closes its listening socket, {load()}")
    for old, new in ((False, False), (True, True), (False, True)):
        ls = listen(port, 8, reuse=old)
        c = socket.create_connection((HOST, port))
        conn, _ = ls.accept()
        conn.close()
        while c.recv(100):
            pass
        c.close()
        ls.close()
        print(f"== port {port}: old server SO_REUSEADDR={int(old)}, new server SO_REUSEADDR={int(new)}")
        print("  " + ss("-tanoH", "state", "time-wait", f"sport = :{port}").strip())
        s = socket.socket()
        if new:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((HOST, port))
            s.listen(8)
            print("  new server bind(): ok, listening again")
        except OSError as e:
            print(f"  new server bind(): {e!r}")
        s.close()
        port += 1


mode = sys.argv[1]
if mode == "sides":
    sides(int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]))
elif mode == "finwait":
    finwait(int(sys.argv[2]))
elif mode == "ports":
    ports(int(sys.argv[2]), int(sys.argv[3]))
elif mode == "restart":
    restart(int(sys.argv[2]))
