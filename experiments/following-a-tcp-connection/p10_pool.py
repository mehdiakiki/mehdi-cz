"""What reusing a connection saves, and the stale connection that comes back.

usage:
  p10_pool.py server PORT [nodelay] [tls] [timeout=SECONDS]
        an HTTP/1.1 server (http.server) on 127.0.0.1 in its own process; nodelay sets TCP_NODELAY on
        each connection, tls uses out/rsa-cert.pem, timeout closes connections idle for SECONDS;
        POST /pay counts a payment, the header X-Drop-Once makes it close the connection once
        without an answer after the payment, and Idempotency-Key makes a repeated payment an answer
        from memory
  p10_pool.py bench PORT COUNT [tls]   COUNT requests on one connection, then COUNT with a new
                                       connection each, and the TIME-WAIT sockets after each batch
  p10_pool.py one PORT [tls]           one request on a new connection, then close
  p10_pool.py stale PORT [tls]         a request, 2 s idle, a check of the socket, then a GET and
                                       then a POST of 1 MiB on the same connection
  p10_pool.py retry PORT               a client that retries once on a new connection: after an
                                       idle close, after a dropped answer, and with Idempotency-Key
"""

import http.client
import http.server
import os
import select
import signal
import socket
import socketserver
import ssl
import statistics
import sys
import threading
import time
import traceback

from tcplab import HOST, counters, load, ss

CERT, KEY = "out/rsa-cert.pem", "out/rsa-key.pem"
LOCK = threading.Lock()


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    payments = 0
    answers = {}
    dropped = set()

    def reply(self, body):
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(f"payments {Handler.payments}\n".encode() if self.path == "/count" else b"hello\n")

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if self.path != "/pay":
            self.reply(b"ok\n")
            return
        key, request = self.headers.get("Idempotency-Key"), self.headers.get("X-Request")
        with LOCK:
            if key in Handler.answers:
                body = Handler.answers[key]
            else:
                Handler.payments += 1
                body = f"payment {Handler.payments} done\n".encode()
                if key:
                    Handler.answers[key] = body
            drop = "X-Drop-Once" in self.headers and request not in Handler.dropped
            Handler.dropped.add(request)
        if drop:
            self.close_connection = True
            return
        self.reply(body)

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    tls = False

    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = "localhost", self.server_address[1]

    def server_activate(self):
        super().server_activate()
        if self.tls:
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain(CERT, KEY)
            self.socket = ctx.wrap_socket(self.socket, server_side=True)


def serve(port, options):
    signal.alarm(900)
    Handler.disable_nagle_algorithm = "nodelay" in options
    Server.tls = "tls" in options
    for option in options:
        if option.startswith("timeout="):
            Handler.timeout = float(option.split("=")[1])
    server = Server((HOST, port), Handler)
    print(f"ready: HTTP/1.1 server on 127.0.0.1:{port}, options {' '.join(options) or 'none'}, pid {os.getpid()}",
          flush=True)
    server.serve_forever()


def connection(port, tls):
    if tls:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.load_verify_locations(CERT)
        return http.client.HTTPSConnection(HOST, port, context=ctx)
    return http.client.HTTPConnection(HOST, port)


def get(conn, path="/"):
    conn.request("GET", path)
    return conn.getresponse().read()


def time_wait(port):
    client = len(ss("-tanH", "state", "time-wait", f"dport = :{port}").splitlines())
    server = len(ss("-tanH", "state", "time-wait", f"sport = :{port}").splitlines())
    return f"TIME-WAIT after it: client side {client}, server side {server}"


def bench(port, count, tls):
    kind = "HTTPS" if tls else "HTTP"
    print(f"{count} {kind} GET requests to 127.0.0.1:{port}, {load()}")
    for mode in ("one connection", "a new connection each"):
        before = counters("TcpOutRsts", "TcpExtTCPAbortOnData")
        durations = []
        conn = connection(port, tls)
        t_start = time.perf_counter()
        for _ in range(count):
            t0 = time.perf_counter()
            if mode == "a new connection each":
                conn = connection(port, tls)
            get(conn)
            if mode == "a new connection each":
                conn.close()
            durations.append(time.perf_counter() - t0)
        total = time.perf_counter() - t_start
        conn.close()
        time.sleep(0.2)
        ms = sorted(d * 1e3 for d in durations)
        print(f"== {mode}: total {total:.2f} s, per request median {statistics.median(ms):.3f} ms, "
              f"p90 {ms[count * 9 // 10]:.3f} ms, p99 {ms[count * 99 // 100]:.3f} ms")
        print(f"  first 3 requests: {' '.join(f'{d * 1e3:.3f}' for d in durations[:3])} ms")
        after = counters("TcpOutRsts", "TcpExtTCPAbortOnData")
        resets = ", ".join(f"{name} +{after[name] - before[name]}" for name in before)
        print(f"  {time_wait(port)}; counters of the whole machine: {resets}")


def states(port, local):
    for line in ss("-tanH", f"( sport = :{local} or dport = :{local} )", f"( sport = :{port} or dport = :{port} )").splitlines():
        print(f"    {line.strip()}")


def stale(port, tls):
    for method in ("GET", "POST"):
        conn = connection(port, tls)
        get(conn)
        local = conn.sock.getsockname()[1]
        print(f"== {method}: request 1 on a new connection: ok; then 2 s without requests")
        time.sleep(2)
        print("  ss for this connection:")
        states(port, local)
        readable = select.select([conn.sock], [], [], 0)[0] != []
        peek = "" if tls else f", recv(1, MSG_PEEK) returns {conn.sock.recv(1, socket.MSG_PEEK)!r}"
        print(f"  check before reuse: select() says readable: {readable}{peek}")
        try:
            if method == "GET":
                get(conn)
            else:
                conn.request("POST", "/upload", body=b"x" * (1 << 20))
                conn.getresponse().read()
            print(f"  request 2 ({method}): ok")
        except Exception as e:
            where = traceback.extract_tb(e.__traceback__)[-1]
            print(f"  request 2 ({method}): {type(e).__module__}.{type(e).__name__}: {e}")
            print(f"    raised in {os.path.basename(where.filename)}, in {where.name}()")
        conn.close()


def pay_with_retry(port, conn, headers):
    for attempt in (1, 2):
        try:
            conn.request("POST", "/pay", body=b"amount=10", headers=headers)
            answer = conn.getresponse().read().decode().strip()
            print(f"  attempt {attempt}: {answer}")
            return
        except (http.client.RemoteDisconnected, ConnectionResetError, BrokenPipeError) as e:
            print(f"  attempt {attempt}: {type(e).__name__}: {e}")
            conn.close()
            conn = connection(port, False)


def payments(port):
    conn = connection(port, False)
    count = get(conn, "/count").decode().strip()
    conn.close()
    return count


def retry(port):
    print(f"one payment of 10, a client that retries once on a new connection, {load()}")
    print(f"== the connection was idle for 2 s and the server closed it; before: {payments(port)}")
    conn = connection(port, False)
    get(conn)
    time.sleep(2)
    pay_with_retry(port, conn, {"X-Request": "a"})
    print(f"  after: {payments(port)}")
    print(f"== the server makes the payment and loses the answer; before: {payments(port)}")
    pay_with_retry(port, connection(port, False), {"X-Request": "b", "X-Drop-Once": "yes"})
    print(f"  after: {payments(port)}")
    print(f"== the same with an Idempotency-Key; before: {payments(port)}")
    pay_with_retry(port, connection(port, False), {"X-Request": "c", "X-Drop-Once": "yes", "Idempotency-Key": "k1"})
    print(f"  after: {payments(port)}")


mode, port = sys.argv[1], int(sys.argv[2])
if mode == "server":
    serve(port, sys.argv[3:])
elif mode == "bench":
    bench(port, int(sys.argv[3]), "tls" in sys.argv[4:])
elif mode == "one":
    conn = connection(port, "tls" in sys.argv[3:])
    print(f"one request: {get(conn)!r}")
    time.sleep(0.2)
    conn.close()
    time.sleep(0.3)
elif mode == "stale":
    stale(port, "tls" in sys.argv[3:])
elif mode == "retry":
    retry(port)
