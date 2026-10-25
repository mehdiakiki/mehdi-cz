# Following a TCP connection

The programs and the outputs of the series "Following a TCP connection": one TCP connection
followed from `connect()` to `close()` and around it, on one laptop, over loopback.

## Machine and toolchain

- Intel Core i7-1260P laptop, Manjaro Linux, kernel 6.6.126 (`CONFIG_HZ=300`), glibc 2.43,
  CPU governor `powersave`. The machine was busy with other work during the runs: every timing
  output records the load average, and the TLS outputs record the CPU frequencies.
- Python 3.14.3 (`/usr/bin/python3`, standard library only), gcc 15.2.1, OpenSSL 3.6.1,
  iproute2 6.18 (`ss`), strace 6.19.
- No root. tcpdump is not used: everything comes from system calls, `ss`, the counters in
  `/proc/net/snmp` and `/proc/net/netstat`, and timings.
- The sysctls of the machine and some constants from the headers of the running kernel are in
  `results/p01-machine.txt`.

## How to run

From the root of the repository:

```sh
sh experiments/following-a-tcp-connection/run.sh            # all ten parts, about 10 minutes
sh experiments/following-a-tcp-connection/run.sh 7          # part 7 only
sh experiments/following-a-tcp-connection/run.sh p02_burst  # one block of a part
RES=out/rerun sh experiments/following-a-tcp-connection/run.sh   # write the outputs elsewhere
PY=/absolute/path/to/python3.14 sh experiments/following-a-tcp-connection/run.sh  # another Python 3.14: give an absolute path to a system interpreter, the outputs print its library paths
```

Build products, logs, certificates and full straces go to `out/` (ignored by git). The files in
`results/` are the outputs quoted in the articles. Timings, ports chosen by the kernel and the
system-wide counters change from run to run; the logic of each output does not. A few outputs
depend on timing by nature: in part 2, clients whose SYNs arrive at almost the same moment can
end up half open on the server side (SYN-RECV) or get a SYN cookie, in the slow server test and
in the burst test. The article describes the saved run and says how often each case happened.

## Safety

- Every socket is on 127.0.0.1 or ::1. Servers listen on ports 21010 to 21165. Part 7 limits
  client sockets to the local ports 40000 to 40019, 40100 to 40119 and 40200 to 40219 with
  `IP_LOCAL_PORT_RANGE`, so the experiment never fills the real ephemeral range of the machine.
- Part 8 resolves only `localhost`, `ip6-localhost` and the hostname of the machine, which are
  answered from `/etc/hosts`. `results/p08-dnscheck.txt` counts the lines with port 53 and the
  connects to other addresses in all the straces of that part, also two traces of the hostname
  lookup (in C and in Python): both are 0. These two traces stay in `out/`, because they contain
  the real hostname. The programs print "the hostname" instead of the real name of the machine.
  The HTTP server of part 10 overrides `server_bind()` so that `http.server` does not make a
  reverse lookup of its address.
- Each server process ends itself after a few minutes (`signal.alarm`), and `run.sh` stops every
  process that it started, also when it fails.
- No sysctl is changed. `TCP_SYNCNT`, `TCP_LINGER2`, `IP_LOCAL_PORT_RANGE`, `SO_RCVBUF` and
  `SO_SNDBUF` are set on single sockets only.

## The files

- `tcplab.py`: helpers used by the Python programs (ss, counters, load, timing summary, listen).
- `listener.py`: a listening socket in its own process that never accepts, or accepts and closes.

### Part 1, connect()

- `p01_client.py`: one blocking connect, a connect with a timeout, 2000 timed connects, a connect
  with `TCP_SYNCNT` to a full listener with the SYN retries seen by `ss -o`, and a connect whose
  socket is kept after the timeout.
- `results/p01-strace.txt`, `p01-connect-time.txt`, `p01-synretry.txt`, `p01-machine.txt`.

### Part 2, the accept queue

- `p02_queue.py`: a listener that never accepts (`fill`), how many connections fit for several
  backlogs (`sizes`), a server that accepts one connection every 1.5 s (`slow`), and 16 connects
  at the same moment with clients that send or stay silent (`burst`).
- `results/p02-fill.txt`, `p02-sizes.txt`, `p02-slow.txt`, `p02-burst.txt`.

### Part 3, Nagle and delayed ACK

- `p03_nagle.py`: 200 requests of 16 + 32 bytes. Mode `two` writes each request in two `send()`
  calls on purpose, and mode `quickonce` sets `TCP_QUICKACK` only once on purpose: both wait for
  the delayed ACK timer. The other modes are the fixes.
- `results/p03-nagle.txt`, `p03-strace.txt`.

### Part 4, the byte stream

- `p04_stream.py`: three sends and one recv, 1 MiB in one `sendall()` and the sizes of the
  `recv()` calls, and three readers. `read_broken` is wrong on purpose: it takes one `recv()` as
  one message, and it sleeps 50 ms to be slower than the sender.
- `results/p04-coalesce.txt`, `p04-split.txt`, `p04-framing.txt`, `p04-strace.txt`.

### Part 5, socket buffers

- `p05_buffers.py`: a receiver that never reads and a non-blocking sender, buffer sizes after
  `setsockopt`, a blocking `sendall()` of 8 MiB, and a producer with a queue. With `maxsize` 0 the
  queue is unbounded on purpose, to show the memory growth.
- `results/p05-fill.txt`, `p05-sizes.txt`, `p05-block.txt`, `p05-strace.txt`, `p05-queue.txt`.

### Part 6, close()

- `p06_close.py`: five ways to end a connection, each once with its output and 20 more times for
  the counters. The cases `unread`, `linger` and `closed` produce resets on purpose, and `leak`
  never closes the accepted sockets on purpose (CLOSE-WAIT).
- `p06_sigpipe.c`: writes two times to a connection that the server closed. With the default
  action for `SIGPIPE` it is killed on purpose by the second write.
- `results/p06-close.txt`, `p06-sigpipe.txt`, `p06-leak.txt`.

### Part 7, TIME_WAIT

- `p07_timewait.py`: which side keeps TIME-WAIT and for how long, `TCP_LINGER2` against
  FIN-WAIT-2 and TIME-WAIT, local port exhaustion with a range of 20 ports (on purpose), and a
  server restart with and without `SO_REUSEADDR`.
- `results/p07-sides.txt`, `p07-finwait.txt`, `p07-ports.txt`, `p07-restart.txt`, `p07-sysctls.txt`.

### Part 8, getaddrinfo

- `p08_gai.c` and `p08_gai.py`: the answers of `getaddrinfo()` and their order, timings, the
  lookup of asyncio in a thread, and `create_connection()` to `localhost` while the server listens
  on 127.0.0.1 only.
- `results/p08-answers.txt`, `p08-strace.txt`, `p08-time.txt`, `p08-asyncio.txt`,
  `p08-connect.txt`, `p08-modules.txt`, `p08-dnscheck.txt`, `p08-libc.txt`.
- The DNS check and the `nm -D` output are separate blocks of `run.sh`, `p08_dnscheck` and
  `p08_libc`, added after the other outputs of this part were saved. `p08_dnscheck` reads the
  straces that `p08_gai` leaves in `out/`, so it runs after it. `p08-libc.txt` counts with
  `nm -D` the functions of the NSS files module inside `libc.so.6`.

### Part 9, TLS

- `p09_tls.py`: a TLS server in its own process (with a request for its own CPU time), a client
  that times plain TCP, full TLS and resumed TLS connections, and a parser that lists the TLS
  records of a connection from an `strace -xx` file of the client. The certificates are made by
  `run.sh` with `openssl req` in `out/`. The server on port 21093 does not set `TCP_NODELAY`, on
  purpose: its first byte after the handshake waits for the delayed ACK of the client.
- `results/p09-certs.txt`, `p09-sclient.txt`, `p09-records.txt`, `p09-cost.txt`, `p09-speed.txt`,
  `p09-firstbyte.txt`.

### Part 10, connection pools

- `p10_pool.py`: an HTTP/1.1 server made with `http.server` in its own process, and clients for
  1000 requests on one connection or a new connection each, a request on a stale connection, and
  a payment with a retry. The server on port 21101 does not set `TCP_NODELAY`, on purpose (it is
  the default of `http.server`). The header `X-Drop-Once` makes the server close the connection
  without an answer after a payment, to simulate a lost answer, and the retry client repeats a
  non-idempotent request on purpose to show the double payment.
- `results/p10-bench.txt`, `p10-stale.txt`, `p10-retry.txt`, `p10-tlsclose.txt`.
