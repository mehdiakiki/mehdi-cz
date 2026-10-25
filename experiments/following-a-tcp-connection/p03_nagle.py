"""A request written in two small pieces, Nagle's algorithm and delayed ACK.

usage: p03_nagle.py MODE PORT COUNT
  MODE two         header and body in two send() calls
  MODE nodelay     the same, with TCP_NODELAY on the client socket
  MODE join        one sendall() of header + body
  MODE sendmsg     one sendmsg() call with the two buffers
  MODE quickonce   two send() calls, the server sets TCP_QUICKACK once after accept()
  MODE quickevery  two send() calls, the server sets TCP_QUICKACK after every recv()
The server reads the whole request (16 + 32 bytes) before it answers with 2 bytes.
"""

import socket
import sys
import threading
import time

from tcplab import HOST, counters, listen, load, print_delta, ss, summary

HEADER = b"H" * 16
BODY = b"B" * 32
FIELDS = ("rtt", "ato", "mss", "data_segs_out", "data_segs_in")


def serve(ls, mode):
    conn, _ = ls.accept()
    if mode == "quickonce":
        conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_QUICKACK, 1)
    need = len(HEADER) + len(BODY)
    with conn:
        while True:
            request = b""
            while len(request) < need:
                chunk = conn.recv(need - len(request))
                if mode == "quickevery":
                    conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_QUICKACK, 1)
                if not chunk:
                    return
                request += chunk
            conn.sendall(b"OK")


def info(port):
    """A few fields of ss -ti for the client side and the server side of the connection."""
    out = ss("-tniH", f"( sport = :{port} or dport = :{port} )").splitlines()
    lines = []
    for head, details in zip(out[::2], out[1::2]):
        side = "server" if head.split()[3].endswith(f":{port}") else "client"
        values = [w for w in details.split() if w.split(":")[0] in FIELDS]
        lines.append(f"  {side}: {' '.join(values)}")
    return sorted(lines)


def main(mode, port, count):
    ls = listen(port, 8)
    server = threading.Thread(target=serve, args=(ls, mode))
    server.start()
    c = socket.create_connection((HOST, port))
    if mode == "nodelay":
        c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    before = counters("TcpExtDelayedACKs")
    durations = []
    for _ in range(count):
        t0 = time.perf_counter()
        if mode == "join":
            c.sendall(HEADER + BODY)
        elif mode == "sendmsg":
            c.sendmsg([HEADER, BODY])
        else:
            c.send(HEADER)
            c.send(BODY)
        c.recv(2)
        durations.append(time.perf_counter() - t0)
    after = counters("TcpExtDelayedACKs")
    print(f"mode {mode}: {count} requests of 16 + 32 bytes, {load()}")
    print("first 5 requests:", " ".join(f"{d * 1000:.2f}" for d in durations[:5]), "ms")
    summary("request", durations, "ms")
    print(f"requests slower than 30 ms: {sum(d > 0.030 for d in durations)}")
    print_delta(before, after)
    print("\n".join(info(port)))
    c.close()
    server.join()
    ls.close()


main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
