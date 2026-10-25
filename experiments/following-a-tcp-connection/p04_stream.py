"""TCP is a byte stream, not a stream of messages.

usage:
  p04_stream.py coalesce PORT   three send() calls with TCP_NODELAY, the receiver calls recv() once
  p04_stream.py split PORT SIZE one sendall() of 1 MiB, the receiver calls recv(SIZE) in a loop
  p04_stream.py framing PORT    three readers (broken, length prefix, lines) on two inputs
"""

import collections
import json
import socket
import struct
import sys
import threading
import time

from tcplab import HOST, listen, load, ss


def pair(port):
    """A connected client socket and server socket on 127.0.0.1."""
    ls = listen(port, 1)
    c = socket.create_connection((HOST, port))
    s, _ = ls.accept()
    ls.close()
    return c, s


def segments_out(port):
    for line in ss("-tniH", f"dport = :{port}").splitlines():
        for word in line.split():
            if word.startswith("data_segs_out:"):
                return word


def coalesce(port):
    c, s = pair(port)
    c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    for msg in (b"first\n", b"second\n", b"third\n"):
        n = c.send(msg)
        print(f"send({msg!r}) returned {n}")
    time.sleep(0.1)
    data = s.recv(4096)
    print(f"one recv(4096) returned {len(data)} bytes: {data!r}")
    print(f"sender {segments_out(port)}")
    c.close()
    s.close()


def split(port, bufsize):
    c, s = pair(port)
    payload = b"x" * (1 << 20)
    sender = threading.Thread(target=c.sendall, args=(payload,))
    t0 = time.perf_counter()
    sender.start()
    sizes = []
    while sum(sizes) < len(payload):
        sizes.append(len(s.recv(bufsize)))
    elapsed = time.perf_counter() - t0
    sender.join()
    print(f"1 MiB in one sendall(), received with recv({bufsize}), {load()}")
    print(f"{len(sizes)} recv() calls in {elapsed * 1000:.1f} ms, total {sum(sizes)} bytes")
    print(f"smallest {min(sizes)}, largest {max(sizes)}")
    print("first 12 sizes:", " ".join(map(str, sizes[:12])))
    common = collections.Counter(sizes).most_common(4)
    print("most common sizes:", ", ".join(f"{size} x{count}" for size, count in common))
    c.close()
    s.close()


def recv_exactly(sock, n):
    data = bytearray()
    while len(data) < n:
        chunk = sock.recv(n - len(data))
        if not chunk:
            raise EOFError(f"connection closed after {len(data)} of {n} bytes")
        data += chunk
    return bytes(data)


def read_broken(sock):
    time.sleep(0.05)
    return sock.recv(65536)


def read_framed(sock):
    (size,) = struct.unpack("!I", recv_exactly(sock, 4))
    return recv_exactly(sock, size)


class LineReader:
    def __init__(self, sock):
        self.sock = sock
        self.buf = b""

    def __call__(self, sock):
        while b"\n" not in self.buf:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise EOFError("connection closed in the middle of a line")
            self.buf += chunk
        line, self.buf = self.buf.split(b"\n", 1)
        return line


def encode(kind, message):
    body = json.dumps(message).encode()
    if kind == "framed":
        return struct.pack("!I", len(body)) + body
    if kind == "lines":
        return body + b"\n"
    return body


def framing(port):
    inputs = {
        "two small messages": [{"id": 1, "op": "add"}, {"id": 2, "op": "del"}],
        "one message of about 300 kB": [{"id": 3, "data": "y" * 300000}],
    }
    readers = {"broken": read_broken, "framed": read_framed, "lines": None}
    for kind, reader in readers.items():
        print(f"== reader: {kind}")
        for name, messages in inputs.items():
            c, s = pair(port)
            c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            read = reader or LineReader(s)
            frames = [encode(kind, m) for m in messages]
            sender = threading.Thread(target=lambda: [c.sendall(f) for f in frames])
            sender.start()
            results = []
            for _ in messages:
                data = read(s)
                try:
                    msg = json.loads(data)
                    results.append(f"{len(data)} bytes, id {msg['id']}")
                except json.JSONDecodeError as e:
                    results.append(f"{len(data)} bytes, JSONDecodeError: {e}")
                    break
            print(f"  {name}: " + "; ".join(results))
            sender.join()
            c.close()
            s.close()


mode, port = sys.argv[1], int(sys.argv[2])
if mode == "coalesce":
    coalesce(port)
elif mode == "split":
    split(port, int(sys.argv[3]))
elif mode == "framing":
    framing(port)
