"""The accept queue of a listening socket on 127.0.0.1.

usage:
  p02_queue.py fill PORT BACKLOG CLIENTS   a listener that never accepts, CLIENTS connect one by one
                                           with a 1 s timeout and send 5 bytes each
  p02_queue.py sizes PORT                  how many connections fit for several backlogs, and the
                                           backlog of Python's listen() and socketserver.TCPServer
  p02_queue.py slow PORT CLIENTS INTERVAL  backlog 1, the server accepts one connection every INTERVAL
                                           seconds, CLIENTS blocking connects start 10 ms apart
  p02_queue.py burst PORT BACKLOG CLIENTS MODE
                                           CLIENTS connects at the same moment, then the server
                                           accepts for 3 s; MODE send: each connected client sends
                                           its port first, MODE silent: the clients send nothing
"""

import socket
import socketserver
import sys
import threading
import time

from tcplab import HOST, counters, listen, load, print_delta, ss

QUEUE_COUNTERS = ("TcpExtListenOverflows", "TcpExtListenDrops")
COOKIE_COUNTERS = ("TcpExtSyncookiesSent", "TcpExtSyncookiesRecv", "TcpExtTCPReqQFullDoCookies")


def try_connect(port, timeout):
    s = socket.socket()
    s.settimeout(timeout)
    try:
        s.connect((HOST, port))
        return s
    except OSError:
        s.close()
        return None


def fill(port, backlog, clients):
    ls = listen(port, backlog)
    names = QUEUE_COUNTERS + COOKIE_COUNTERS[:1]
    before = counters(*names)
    connected = []
    for i in range(clients):
        t0 = time.perf_counter()
        s = try_connect(port, 1.0)
        ms = (time.perf_counter() - t0) * 1000
        if s is None:
            print(f"client {i}: no connection after {ms:.0f} ms")
            continue
        s.sendall(b"hello")
        print(f"client {i}: connected in {ms:.2f} ms, sent 5 bytes")
        connected.append(s)
    after = counters(*names)
    print(ss("-tln", f"sport = :{port}"), end="")
    print(ss("-tn", "state", "established", f"sport = :{port}"), end="")
    print_delta(before, after)
    print("-- client 0 waits 2 s for an answer")
    connected[0].settimeout(2.0)
    try:
        connected[0].recv(100)
    except TimeoutError as e:
        print(f"recv: {e!r}")
    for s in connected:
        s.close()
    ls.close()


def count_fit(port):
    """Connect until one connect times out, return how many connected."""
    socks = []
    while len(socks) < 5000:
        s = try_connect(port, 0.2)
        if s is None:
            break
        socks.append(s)
    for s in socks:
        s.close()
    return len(socks)


def send_q(port):
    return ss("-tlnH", f"sport = :{port}").split()[2]


def sizes(port):
    for backlog in (0, 1, 5, 100000):
        ls = listen(port, backlog)
        fit = count_fit(port)
        print(f"listen(fd, {backlog}): Send-Q {send_q(port)}, connections that fit: {fit}")
        ls.close()
    ls = socket.socket()
    ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    ls.bind((HOST, port))
    ls.listen()
    print(f"Python socket.listen() without argument: Send-Q {send_q(port)}")
    ls.close()
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer((HOST, port), socketserver.BaseRequestHandler)
    print(f"socketserver.TCPServer: Send-Q {send_q(port)}, request_queue_size = {server.request_queue_size}")
    server.server_close()


def slow(port, clients, interval):
    ls = listen(port, 1)
    t0 = time.perf_counter()
    deadline = interval * (clients + 1)
    opened, accepted, connected = [], set(), set()

    def server():
        while len(accepted) < clients:
            time.sleep(interval)
            if time.perf_counter() - t0 > deadline:
                return
            ls.settimeout(0.01)
            try:
                conn, addr = ls.accept()
            except TimeoutError:
                print(f"  t={time.perf_counter() - t0:6.3f} s  server: accept() found nothing", flush=True)
                continue
            opened.append(conn)
            accepted.add(addr[1])
            print(f"  t={time.perf_counter() - t0:6.3f} s  server: accept() returned port {addr[1]}", flush=True)

    def client(i):
        s = socket.socket()
        start = time.perf_counter()
        s.connect((HOST, port))
        end = time.perf_counter()
        connected.add(s.getsockname()[1])
        print(f"  t={end - t0:6.3f} s  client {i} (port {s.getsockname()[1]}): connect() took {end - start:.3f} s", flush=True)
        opened.append(s)

    def snapshots():
        for at in (2.5, 5.5):
            time.sleep(at - (time.perf_counter() - t0))
            print(f"  t={time.perf_counter() - t0:6.3f} s  ss on the server side:", flush=True)
            for line in ss("-tanoH", "state", "established", "state", "syn-recv", f"sport = :{port}").splitlines():
                print(f"    {line.strip()}", flush=True)

    print(f"{clients} clients, backlog 1, one accept() every {interval} s, {load()}")
    before = counters(*QUEUE_COUNTERS + COOKIE_COUNTERS[:1])
    threads = [threading.Thread(target=server), threading.Thread(target=snapshots)]
    for t in threads:
        t.start()
    for i in range(clients):
        threads.append(threading.Thread(target=client, args=(i,)))
        threads[-1].start()
        time.sleep(0.01)
    for t in threads:
        t.join()
    for p in sorted(connected - accepted):
        print(f"  connected but never accepted: port {p}")
        print(f"    client side: {ss('-tnH', f'sport = :{p}').strip()}")
        print(f"    server side: {ss('-tnH', f'dport = :{p}').strip() or 'no socket'}")
    print_delta(before, counters(*QUEUE_COUNTERS + COOKIE_COUNTERS[:1]))
    for s in opened:
        s.close()
    ls.close()


def server_states(port):
    """Map each client port to the state and timer of its socket on the server side, from ss."""
    states = {}
    for line in ss("-tanoH", f"sport = :{port}").splitlines():
        f = line.split()
        if f[0] != "LISTEN":
            states[int(f[4].rsplit(":", 1)[1])] = " ".join([f[0]] + f[5:])
    return states


def burst(port, backlog, clients, mode):
    ls = listen(port, backlog)
    names = QUEUE_COUNTERS + COOKIE_COUNTERS
    before = counters(*names)
    barrier = threading.Barrier(clients)
    connected = []

    def client():
        s = socket.socket()
        s.settimeout(0.5)
        barrier.wait()
        try:
            s.connect((HOST, port))
            connected.append(s)
        except OSError:
            s.close()

    threads = [threading.Thread(target=client) for _ in range(clients)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    after = counters(*names)
    print(f"{clients} connects at the same moment, backlog {backlog}: {len(connected)} connected, {load()}")
    print(ss("-tln", f"sport = :{port}"), end="")
    states = server_states(port)
    t0 = time.perf_counter()
    for s in connected:
        p = s.getsockname()[1]
        print(f"  client port {p}: client side ESTAB, server side {states.get(p, 'no socket')}")
        if mode == "send":
            s.sendall(str(p).encode())
    if mode == "send":
        time.sleep(0.02)
        print("  ss on the client side, 20 ms after the sends:")
        for line in ss("-tnoH", "state", "established", f"dport = :{port}").splitlines():
            print(f"    {line.strip()}")
    pending = {s.getsockname()[1] for s in connected}
    ls.settimeout(0.1)
    while pending and time.perf_counter() - t0 < 3:
        try:
            conn, addr = ls.accept()
        except TimeoutError:
            continue
        print(f"  t={time.perf_counter() - t0:.3f} s  accept() returned port {addr[1]}")
        conn.close()
        pending.discard(addr[1])
    for p in sorted(pending):
        print(f"  never accepted in 3 s: port {p}, client side {ss('-tnH', f'sport = :{p}').split()[0]}")
    print_delta(before, after)
    for s in connected:
        s.close()
    ls.close()


mode, port = sys.argv[1], int(sys.argv[2])
if mode == "fill":
    fill(port, int(sys.argv[3]), int(sys.argv[4]))
elif mode == "sizes":
    sizes(port)
elif mode == "slow":
    slow(port, int(sys.argv[3]), float(sys.argv[4]))
elif mode == "burst":
    burst(port, int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])
