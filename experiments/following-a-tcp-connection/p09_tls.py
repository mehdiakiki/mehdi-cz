"""What a TLS 1.3 handshake costs on 127.0.0.1.

usage:
  p09_tls.py server PORT CERT KEY [nodelay]
                                     a server in its own process; the first byte of a connection
                                     selects the work: a TLS record starts a handshake, "p" is plain
                                     TCP, "c" asks for the CPU time of the server process; with
                                     nodelay the server sets TCP_NODELAY on each connection
  p09_tls.py client PORT CERT COUNT  COUNT plain connections, COUNT full handshakes, COUNT resumed ones
  p09_tls.py firstbyte PORT CERT COUNT
                                     the handshake time and the wait for the first byte after it
  p09_tls.py once PORT CERT          one full handshake, then one resumed handshake (for strace)
  p09_tls.py records FILE            the TLS records of each TCP connection in an strace -xx file
                                     of the client (socket, connect, read, write and close calls)
"""

import re
import resource
import signal
import socket
import ssl
import statistics
import sys
import time

from tcplab import HOST, listen, load, ss


def cpu_seconds():
    r = resource.getrusage(resource.RUSAGE_SELF)
    return r.ru_utime + r.ru_stime


def server(port, cert, key, nodelay):
    signal.alarm(600)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(cert, key)
    ls = listen(port, 128)
    print(f"ready: TLS server on 127.0.0.1:{port}", flush=True)
    while True:
        raw, _ = ls.accept()
        if nodelay:
            raw.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        try:
            first = raw.recv(1, socket.MSG_PEEK)
            if first == b"c":
                raw.recv(1)
                raw.sendall(f"{cpu_seconds():.6f}".encode())
            elif first == b"p":
                raw.recv(1)
                raw.sendall(b"x")
                raw.recv(1)
            else:
                conn = ctx.wrap_socket(raw, server_side=True)
                conn.sendall(b"x")
                conn.recv(1)
                conn.close()
        except (ssl.SSLError, OSError):
            pass
        raw.close()


def server_cpu(port):
    with socket.create_connection((HOST, port)) as c:
        c.sendall(b"c")
        return float(c.recv(100))


def byte_counts(sock):
    """bytes_sent and bytes_received of this socket, from ss -ti."""
    out = ss("-tniH", f"sport = :{sock.getsockname()[1]}")
    found = dict(re.findall(r"\b(bytes_sent|bytes_received):(\d+)", out))
    return int(found.get("bytes_sent", 0)), int(found.get("bytes_received", 0))


def plain_once(port, count_bytes=False):
    t0 = time.perf_counter()
    c = socket.create_connection((HOST, port))
    t1 = time.perf_counter()
    c.sendall(b"p")
    c.recv(1)
    c.sendall(b"y")
    counts = byte_counts(c) if count_bytes else None
    c.close()
    return t1 - t0, 0.0, counts, False, None


def tls_once(port, ctx, session=None, describe=False, count_bytes=False):
    t0 = time.perf_counter()
    raw = socket.create_connection((HOST, port))
    t1 = time.perf_counter()
    c = ctx.wrap_socket(raw, server_hostname="localhost", session=session)
    t2 = time.perf_counter()
    c.recv(1)
    c.sendall(b"y")
    counts = byte_counts(c) if count_bytes else None
    reused, new_session = c.session_reused, c.session
    if describe:
        print(f"one connection: {c.version()}, cipher {c.cipher()[0]}")
    c.close()
    return t1 - t0, t2 - t1, counts, reused, new_session


def mhz():
    with open("/proc/cpuinfo") as f:
        values = sorted(float(line.split(":")[1]) for line in f if line.startswith("cpu MHz"))
    return f"CPU MHz now: min {values[0]:.0f}, max {values[-1]:.0f}"


def client(port, cert, count):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.load_verify_locations(cert)
    print(f"{count} connections of each kind to 127.0.0.1:{port}, certificate {cert}, {load()}")
    print(f"library: {ssl.OPENSSL_VERSION}, {mhz()}")
    session = tls_once(port, ctx, describe=True)[4]
    for kind in ("plain TCP", "full TLS", "resumed TLS"):
        server_before, client_before = server_cpu(port), cpu_seconds()
        runs = []
        for i in range(count):
            last = i == count - 1
            if kind == "plain TCP":
                runs.append(plain_once(port, last))
            elif kind == "full TLS":
                runs.append(tls_once(port, ctx, count_bytes=last))
            else:
                runs.append(tls_once(port, ctx, session, count_bytes=last))
                session = runs[-1][4] or session
        client_cpu = (cpu_seconds() - client_before) / count * 1e6
        server_used = (server_cpu(port) - server_before) / count * 1e6
        connect_us = statistics.median(r[0] for r in runs) * 1e6
        handshake = sorted(r[1] * 1e6 for r in runs)
        sent, received = runs[-1][2]
        print(f"== {kind}")
        print(f"  connect() median {connect_us:.1f} us, handshake median {statistics.median(handshake):.1f} us, "
              f"p90 {handshake[count * 9 // 10]:.1f} us")
        print(f"  CPU per connection: client {client_cpu:.0f} us, server {server_used:.0f} us")
        print(f"  bytes on the last connection, client side: sent {sent}, received {received}")
        print(f"  session reused: {sum(r[3] for r in runs)} of {count}")


def firstbyte(port, cert, count):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.load_verify_locations(cert)
    handshakes, waits = [], []
    for _ in range(count):
        raw = socket.create_connection((HOST, port))
        t0 = time.perf_counter()
        c = ctx.wrap_socket(raw, server_hostname="localhost")
        t1 = time.perf_counter()
        c.recv(1)
        t2 = time.perf_counter()
        c.sendall(b"y")
        c.close()
        handshakes.append(t1 - t0)
        waits.append(t2 - t1)
    print(f"  {count} connections: handshake median {statistics.median(handshakes) * 1e3:.2f} ms, "
          f"then the first byte after {statistics.median(waits) * 1e3:.2f} ms (median), {load()}")


def once(port, cert):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.load_verify_locations(cert)
    first = tls_once(port, ctx, count_bytes=True)
    second = tls_once(port, ctx, first[4], count_bytes=True)
    print(f"first: {first[2]}, second: {second[2]}, second reused: {second[3]}")


TLS_TYPES = {20: "change_cipher_spec", 21: "alert", 22: "handshake", 23: "application_data"}


def records(path):
    """Print the TLS records that each TCP connection of the client wrote and read."""
    sock = connected = None
    pending = {}
    for line in open(path):
        if m := re.match(r"^socket\(AF_INET, SOCK_STREAM.* = (\d+)$", line):
            sock = m.group(1)
        elif sock and line.startswith(f"connect({sock},"):
            connected, pending = sock, {"write": b"", "read": b""}
            print("== a new TCP connection")
        elif connected and line.startswith(f"close({connected})"):
            connected = sock = None
        elif connected and (m := re.match(rf'^(write|read)\({connected}, "((?:\\x[0-9a-f]{{2}})*)"', line)):
            call = m.group(1)
            pending[call] += bytes.fromhex(m.group(2).replace("\\x", ""))
            data = pending[call]
            while len(data) >= 5 and len(data) >= 5 + int.from_bytes(data[3:5], "big"):
                length = int.from_bytes(data[3:5], "big")
                side = "client -> server" if call == "write" else "server -> client"
                print(f"  {side}  {TLS_TYPES.get(data[0], data[0]):18} record of {length:5d} bytes")
                data = data[5 + length:]
            pending[call] = data


mode = sys.argv[1]
if mode == "server":
    server(int(sys.argv[2]), sys.argv[3], sys.argv[4], len(sys.argv) > 5 and sys.argv[5] == "nodelay")
elif mode == "client":
    client(int(sys.argv[2]), sys.argv[3], int(sys.argv[4]))
elif mode == "firstbyte":
    firstbyte(int(sys.argv[2]), sys.argv[3], int(sys.argv[4]))
elif mode == "once":
    once(int(sys.argv[2]), sys.argv[3])
elif mode == "records":
    records(sys.argv[2])
