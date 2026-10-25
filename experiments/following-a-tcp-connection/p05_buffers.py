"""Socket buffers, a receiver that stops reading, and backpressure.

usage:
  p05_buffers.py fill PORT [SNDBUF RCVBUF]  a non-blocking sender writes until EAGAIN, the receiver
                                            never reads; SNDBUF and RCVBUF are set with setsockopt
  p05_buffers.py sizes PORT                 what getsockopt returns after setsockopt
  p05_buffers.py block PORT                 a blocking sendall() of 8 MiB, the receiver starts to
                                            read after 2 s
  p05_buffers.py queue PORT MAXSIZE         a producer puts 64 KiB messages in a queue every 1 ms,
                                            a sender thread sends them to a slow receiver;
                                            MAXSIZE 0 means an unbounded queue
"""

import queue
import socket
import sys
import threading
import time

from tcplab import HOST, listen, load, on_port, ss

CHUNK = 64 * 1024


def bufs(sock):
    return (sock.getsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF),
            sock.getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF))


def pair(port, sndbuf=0, rcvbuf=0):
    """A connected sender and receiver. The buffer sizes are set before connect and before listen."""
    ls = socket.socket()
    ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if rcvbuf:
        ls.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, rcvbuf)
    ls.bind((HOST, port))
    ls.listen(1)
    c = socket.socket()
    if sndbuf:
        c.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, sndbuf)
    print(f"sender before connect: SO_SNDBUF {bufs(c)[0]}")
    c.connect((HOST, port))
    s, _ = ls.accept()
    ls.close()
    print(f"sender after connect: SO_SNDBUF {bufs(c)[0]}, receiver: SO_RCVBUF {bufs(s)[1]}")
    return c, s


def fill(port, sndbuf, rcvbuf):
    c, s = pair(port, sndbuf, rcvbuf)
    c.setblocking(False)
    total = calls = 0
    while True:
        try:
            total += c.send(b"x" * CHUNK)
            calls += 1
        except BlockingIOError as e:
            print(f"after {calls} send() calls and {total} bytes: {e!r}")
            break
    time.sleep(0.5)
    print("-- ss -tmo 0.5 s later, the receiver")
    print(ss("-tnmo", f"sport = :{port}"), end="")
    print("-- the sender")
    print(ss("-tnmoH", f"dport = :{port}"), end="")
    c.close()
    s.close()


def sizes(port):
    for opt, name in ((socket.SO_SNDBUF, "SO_SNDBUF"), (socket.SO_RCVBUF, "SO_RCVBUF")):
        for asked in (4096, 65536, 1 << 20):
            sock = socket.socket()
            sock.setsockopt(socket.SOL_SOCKET, opt, asked)
            print(f"setsockopt({name}, {asked}) then getsockopt: {sock.getsockopt(socket.SOL_SOCKET, opt)}")
            sock.close()


def block(port):
    c, s = pair(port)
    payload = b"x" * (8 << 20)
    done = threading.Event()
    t0 = time.perf_counter()

    def send():
        c.sendall(payload)
        print(f"  t={time.perf_counter() - t0:5.2f} s  sendall() of 8 MiB returned", flush=True)
        done.set()

    def sample():
        while not done.is_set():
            queues = {}
            for line in ss("-tnH", on_port(port)).splitlines():
                f = line.split()
                queues["receiver" if f[3].endswith(f":{port}") else "sender"] = (f[1], f[2])
            print(f"  t={time.perf_counter() - t0:5.2f} s  receiver Recv-Q {queues['receiver'][0]}, "
                  f"sender Send-Q {queues['sender'][1]}", flush=True)
            time.sleep(0.5)

    print(f"blocking sendall() of 8 MiB, the receiver reads after 2 s, {load()}")
    threads = [threading.Thread(target=send), threading.Thread(target=sample)]
    for t in threads:
        t.start()
    time.sleep(2)
    print(f"  t={time.perf_counter() - t0:5.2f} s  receiver starts to read", flush=True)
    got = 0
    while got < len(payload):
        got += len(s.recv(1 << 20))
    print(f"  t={time.perf_counter() - t0:5.2f} s  receiver has all {got} bytes", flush=True)
    for t in threads:
        t.join()
    c.close()
    s.close()


def rss_mib():
    with open("/proc/self/status") as f:
        for line in f:
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) / 1024


def queue_test(port, maxsize):
    c, s = pair(port)
    q = queue.Queue(maxsize=maxsize)
    stop = threading.Event()
    produced = []

    def producer():
        while not stop.is_set():
            try:
                q.put(b"m" * CHUNK, timeout=0.1)
            except queue.Full:
                continue
            produced.append(time.perf_counter())
            time.sleep(0.001)

    def sender():
        while not stop.is_set():
            try:
                c.sendall(q.get(timeout=0.1))
            except queue.Empty:
                continue

    def slow_receiver():
        while True:
            data = s.recv(CHUNK)
            if not data:
                return
            time.sleep(0.004)

    kind = "unbounded queue" if maxsize == 0 else f"queue of at most {maxsize} messages"
    print(f"{kind}: producer every 1 ms, receiver reads 64 KiB every 4 ms, {load()}")
    print(f"  start: RSS {rss_mib():.0f} MiB")
    threads = [threading.Thread(target=f) for f in (producer, sender, slow_receiver)]
    for t in threads:
        t.start()
    t0 = time.perf_counter()
    for second in (1, 2, 3):
        time.sleep(second - (time.perf_counter() - t0))
        print(f"  t={second} s: produced {len(produced)} messages, waiting in the queue {q.qsize()} "
              f"({q.qsize() * CHUNK / 2**20:.0f} MiB), RSS {rss_mib():.0f} MiB", flush=True)
    stop.set()
    threads[0].join()
    threads[1].join()
    c.close()
    threads[2].join()
    s.close()


mode, port = sys.argv[1], int(sys.argv[2])
if mode == "fill":
    sndbuf, rcvbuf = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 3 else (0, 0)
    fill(port, sndbuf, rcvbuf)
elif mode == "sizes":
    sizes(port)
elif mode == "block":
    block(port)
elif mode == "queue":
    queue_test(port, int(sys.argv[3]))
