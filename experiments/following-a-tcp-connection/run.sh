#!/bin/sh
# Runs the experiments of this fixture and writes their outputs into results/.
#   sh experiments/following-a-tcp-connection/run.sh      runs every part
#   sh experiments/following-a-tcp-connection/run.sh 7    runs part 7 only
#   sh experiments/following-a-tcp-connection/run.sh p01_time    runs one block of a part
#   RES=out/rerun sh experiments/following-a-tcp-connection/run.sh    writes the results elsewhere
# Every socket is on 127.0.0.1 or ::1, every port is above 20000.
set -eu
cd "$(dirname "$0")"
OUT=out
RES="${RES:-results}"
mkdir -p "$OUT" "$RES"
HEADERS="/usr/lib/modules/$(uname -r)/build/include"
PY="${PY:-/usr/bin/python3}"
export PYTHONDONTWRITEBYTECODE=1
PIDS=""

cleanup() {
  for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

# forget PID: remove a stopped process from the list that cleanup kills
forget() {
  kept=""
  for p in $PIDS; do
    [ "$p" = "$1" ] || kept="$kept $p"
  done
  PIDS="$kept"
}

load() {
  echo "load average $(cut -d' ' -f1-3 /proc/loadavg)"
}

wait_for_line() {
  tries=0
  until grep -q "$2" "$1" 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -gt 400 ]; then
      echo "timeout waiting for '$2' in $1" >&2
      exit 1
    fi
    sleep 0.05
  done
}

# start_listener PORT BACKLOG MODE SECONDS: runs listener.py in the background
start_listener() {
  "$PY" listener.py "$1" "$2" "$3" "$4" > "$OUT/listener-$1.log" 2>&1 &
  LISTENER=$!
  PIDS="$PIDS $LISTENER"
  wait_for_line "$OUT/listener-$1.log" ready
  cat "$OUT/listener-$1.log"
}

stop_listener() {
  kill "$LISTENER" 2>/dev/null || true
  wait "$LISTENER" 2>/dev/null || true
  forget "$LISTENER"
}

# start_bg LOG COMMAND...: a server in the background that prints a ready line; its pid is in BG
start_bg() {
  log="$1"
  shift
  "$@" > "$log" 2>&1 &
  BG=$!
  PIDS="$PIDS $BG"
  wait_for_line "$log" ready
}

stop_bg() {
  for pid in "$@"; do
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    forget "$pid"
  done
}

# from_socket FILE: the lines of an strace file from the first socket() call on
from_socket() {
  sed -n '/^socket(/,$p' "$1"
}

sysctl_line() {
  echo "net.$(echo "$1" | tr / .) = $(tr '\t' ' ' < "/proc/sys/net/$1")"
}

machine_facts() {
  echo "kernel: $(uname -r)"
  echo "python: $("$PY" -c 'import sys; print(sys.version.split()[0])')"
  echo "openssl: $(openssl version)"
  echo "CONFIG_HZ=$(zcat /proc/config.gz | grep '^CONFIG_HZ=' | cut -d= -f2)"
  echo "loopback: $(ip -o link show lo | grep -o 'mtu [0-9]*')"
  for k in ipv4/tcp_syn_retries ipv4/tcp_syn_linear_timeouts ipv4/tcp_synack_retries \
    ipv4/tcp_syncookies ipv4/tcp_max_syn_backlog ipv4/tcp_abort_on_overflow core/somaxconn \
    ipv4/tcp_fin_timeout ipv4/tcp_tw_reuse ipv4/tcp_timestamps ipv4/ip_local_port_range \
    ipv4/tcp_max_tw_buckets ipv4/tcp_rmem ipv4/tcp_wmem core/rmem_default core/rmem_max \
    core/wmem_default core/wmem_max ipv4/tcp_moderate_rcvbuf ipv4/tcp_autocorking \
    ipv4/tcp_keepalive_time; do
    sysctl_line "$k"
  done
  echo "-- $HEADERS/net/tcp.h"
  sed -n '/^#define TCP_TIMEWAIT_LEN/,/^#define TCP_RTO_MIN/p' "$HEADERS/net/tcp.h"
  grep '^#define TCP_TIMEOUT_INIT' "$HEADERS/net/tcp.h"
  echo "-- $HEADERS/net/sock.h"
  grep -A3 'static inline bool sk_acceptq_is_full' "$HEADERS/net/sock.h"
  echo "-- $HEADERS/net/inet_connection_sock.h"
  grep -A3 'static inline int inet_csk_reqsk_queue_is_full' "$HEADERS/net/inet_connection_sock.h"
}

p01_strace() {
  machine_facts > "$RES/p01-machine.txt"
  {
    echo "== a listener with backlog 8 that never calls accept, $(load)"
    start_listener 21010 8 never 60
    echo "== one blocking connect under strace -T, then ss, then close"
    strace -T -e trace=%network -e signal=none -o "$OUT/p01-connect.strace" \
      "$PY" p01_client.py connect 21010
    echo "-- strace of the client"
    from_socket "$OUT/p01-connect.strace"
    echo "== socket.create_connection with timeout=2 to the same listener"
    strace -T -e trace=%network,poll,ioctl -e signal=none -o "$OUT/p01-timeout.strace" \
      "$PY" p01_client.py timeout 21010 2
    from_socket "$OUT/p01-timeout.strace"
    stop_listener
    echo "== one blocking connect to port 21012, where nothing listens"
    strace -T -e trace=%network -e signal=none -o "$OUT/p01-refused.strace" \
      "$PY" p01_client.py connect 21012
    from_socket "$OUT/p01-refused.strace"
    echo "== a listener with backlog 0 that never accepts, filled by one connection"
    start_listener 21013 0 never 60
    "$PY" p01_client.py connect 21013
    echo "== socket.create_connection with timeout=2 to the full listener"
    strace -T -e trace=%network,poll,ioctl -e signal=none -o "$OUT/p01-fulltimeout.strace" \
      "$PY" p01_client.py timeout 21013 2
    from_socket "$OUT/p01-fulltimeout.strace"
    stop_listener
  } > "$RES/p01-strace.txt"
}

p01_time() {
  {
    start_listener 21011 4096 close 600
    for run in 1 2 3 4 5; do
      echo "== run $run, a listener that accepts and closes at once"
      "$PY" p01_client.py time 21011 2000
    done
    stop_listener
    for run in 1 2 3 4 5; do
      echo "== run $run, nothing listens on the port"
      "$PY" p01_client.py time 21012 2000
    done
  } > "$RES/p01-connect-time.txt"
}

p01_synretry() {
  {
    for syncnt in 2 0; do
      echo "== a full listener, then one blocking connect with TCP_SYNCNT=$syncnt (0 means the default)"
      start_listener 21013 0 never 300
      "$PY" p01_client.py connect 21013 > /dev/null
      "$PY" p01_client.py synretry 21013 "$syncnt"
      stop_listener
    done
    echo "== a full listener, then a connect with a 1.5 s timeout that keeps the socket"
    start_listener 21013 0 never 60
    "$PY" p01_client.py connect 21013 > /dev/null
    "$PY" p01_client.py abandon 21013 1.5
    stop_listener
  } > "$RES/p01-synretry.txt"
}

part1() {
  p01_strace
  p01_time
  p01_synretry
}

p02_fill() {
  {
    echo "== backlog 3, the listening socket never calls accept, $(load)"
    "$PY" p02_queue.py fill 21020 3 6
  } > "$RES/p02-fill.txt"
  {
    echo "== how many connections fit in the accept queue, $(load)"
    "$PY" p02_queue.py sizes 21021
  } > "$RES/p02-sizes.txt"
}

p02_slow() {
  for run in 1 2 3 4 5 6; do
    echo "== run $run"
    "$PY" p02_queue.py slow 21022 5 1.5
  done > "$RES/p02-slow.txt"
}

p02_burst() {
  for mode in send silent; do
    for run in 1 2 3 4 5 6 7 8; do
      echo "== run $run, the connected clients: $mode"
      "$PY" p02_queue.py burst 21023 2 16 "$mode"
    done
  done > "$RES/p02-burst.txt"
}

part2() {
  p02_fill
  p02_slow
  p02_burst
}

p03_nagle() {
  port=21030
  for mode in two nodelay join sendmsg quickonce quickevery; do
    port=$((port + 1))
    "$PY" p03_nagle.py "$mode" "$port" 200
  done > "$RES/p03-nagle.txt"
}

p03_strace() {
  {
    echo "== mode two under strace -T, client thread only, $(load)"
    strace -T -e trace=sendto,recvfrom -o "$OUT/p03-two.strace" "$PY" p03_nagle.py two 21037 6 > /dev/null
    grep -E '^(sendto|recvfrom)' "$OUT/p03-two.strace" | tail -9
    echo "== mode join under strace -T"
    strace -T -e trace=sendto,recvfrom -o "$OUT/p03-join.strace" "$PY" p03_nagle.py join 21038 6 > /dev/null
    grep -E '^(sendto|recvfrom)' "$OUT/p03-join.strace" | tail -6
  } > "$RES/p03-strace.txt"
}

part3() {
  p03_nagle
  p03_strace
}

p04_stream() {
  {
    echo "== three small messages, $(load)"
    "$PY" p04_stream.py coalesce 21041
  } > "$RES/p04-coalesce.txt"
  for size in 65536 1048576; do
    for run in 1 2 3; do
      echo "== run $run"
      "$PY" p04_stream.py split 21042 "$size"
    done
  done > "$RES/p04-split.txt"
  "$PY" p04_stream.py framing 21043 > "$RES/p04-framing.txt"
  {
    echo "== 1 MiB in one sendall() under strace, the sender side"
    strace -f -e trace=sendto -o "$OUT/p04-split.strace" "$PY" p04_stream.py split 21044 65536 > /dev/null
    grep -c 'sendto(' "$OUT/p04-split.strace"
    grep 'sendto(' "$OUT/p04-split.strace" | sed 's/^[0-9]* *//'
  } > "$RES/p04-strace.txt"
}

part4() {
  p04_stream
}

p05_buffers() {
  {
    echo "== default buffers, the receiver never reads, $(load)"
    "$PY" p05_buffers.py fill 21051
    echo "== SO_SNDBUF 32768 on the sender and SO_RCVBUF 16384 on the receiver, $(load)"
    "$PY" p05_buffers.py fill 21052 32768 16384
  } > "$RES/p05-fill.txt"
  "$PY" p05_buffers.py sizes 21053 > "$RES/p05-sizes.txt"
  "$PY" p05_buffers.py block 21054 > "$RES/p05-block.txt"
  {
    echo "== the blocking sendall() under strace -f -T, $(load)"
    strace -f -T -e trace=sendto -o "$OUT/p05-block.strace" "$PY" p05_buffers.py block 21058 > /dev/null
    grep -E 'sendto\(|sendto resumed' "$OUT/p05-block.strace" | sed 's/^[0-9]* *//'
  } > "$RES/p05-strace.txt"
  for maxsize in 0 32; do
    "$PY" p05_buffers.py queue 21055 "$maxsize"
  done > "$RES/p05-queue.txt"
}

part5() {
  p05_buffers
}

p06_close() {
  port=21060
  for case in normal unread linger halfclose closed; do
    port=$((port + 1))
    echo "== $case, $(load)"
    "$PY" p06_close.py "$case" "$port"
  done > "$RES/p06-close.txt"
}

p06_sigpipe() {
  gcc -O2 -Wall -Wextra -o "$OUT/p06_sigpipe" p06_sigpipe.c
  {
    start_listener 21066 8 close 30
    echo "== C client, default action for SIGPIPE"
    status=0
    "$OUT/p06_sigpipe" 21066 || status=$?
    echo "exit status: $status"
    echo "== C client, SIGPIPE ignored"
    "$OUT/p06_sigpipe" 21066 ignore
    echo "== C client, default action, under strace"
    strace -e trace=write -o "$OUT/p06-sigpipe.strace" "$OUT/p06_sigpipe" 21066 > /dev/null || true
    grep -E 'write\(3|SIGPIPE' "$OUT/p06-sigpipe.strace"
    stop_listener
  } > "$RES/p06-sigpipe.txt"
}

p06_leak() {
  {
    echo "== CLOSE-WAIT leak, $(load)"
    "$PY" p06_close.py leak 21067 50
  } > "$RES/p06-leak.txt"
}

part6() {
  p06_close
  p06_sigpipe
  p06_leak
}

p07_sides() {
  "$PY" p07_timewait.py sides 21071 21072 500 > "$RES/p07-sides.txt"
}

p07_finwait() {
  "$PY" p07_timewait.py finwait 21074 > "$RES/p07-finwait.txt"
}

p07_ports() {
  "$PY" p07_timewait.py ports 21079 40000 > "$RES/p07-ports.txt"
}

p07_restart() {
  "$PY" p07_timewait.py restart 21076 > "$RES/p07-restart.txt"
}

p07_sysctls() {
  {
    echo "== the files in /proc/sys/net/ipv4 with tw, fin or linger in the name"
    ls /proc/sys/net/ipv4 | grep -E 'tw|fin|linger'
    for k in ipv4/tcp_fin_timeout ipv4/tcp_tw_reuse ipv4/tcp_max_tw_buckets ipv4/tcp_timestamps ipv4/ip_local_port_range; do
      sysctl_line "$k"
    done
  } > "$RES/p07-sysctls.txt"
}

part7() {
  p07_sysctls
  p07_sides
  p07_finwait
  p07_ports
  p07_restart
}

p08_gai() {
  rm -f "$OUT"/p08-*.strace
  gcc -O2 -Wall -Wextra -o "$OUT/p08_gai" p08_gai.c
  {
    echo "== lines 2 and 3 of /etc/hosts"
    sed -n '2,3p' /etc/hosts
    echo "lines of /etc/hosts with the hostname of this machine: $(grep -c "$(hostname)" /etc/hosts)"
    echo "== the hosts line of /etc/nsswitch.conf"
    grep '^hosts:' /etc/nsswitch.conf
    echo "== /etc/gai.conf: $(grep -cvE '^(#|$)' /etc/gai.conf || true) lines that are not comments, the default precedence table in its comments"
    grep -E '^#precedence' /etc/gai.conf | head -5
    echo "== answers in C"
    "$OUT/p08_gai" show 127.0.0.1 localhost ip6-localhost @hostname
    echo "== answers in Python"
    "$PY" p08_gai.py show 127.0.0.1 localhost ip6-localhost @hostname
  } > "$RES/p08-answers.txt"
  {
    echo "== one getaddrinfo(\"localhost\") in C under strace, from the first file of the lookup"
    strace -e trace=openat,socket,connect,bind,sendto -o "$OUT/p08-localhost.strace" "$OUT/p08_gai" show localhost > /dev/null
    sed -n '/nsswitch.conf/,$p' "$OUT/p08-localhost.strace"
    echo "== one getaddrinfo(\"ip6-localhost\") in C under strace, one answer: from /etc/hosts on"
    strace -e trace=openat,socket,connect,bind,sendto -o "$OUT/p08-ip6.strace" "$OUT/p08_gai" show ip6-localhost > /dev/null
    sed -n '/"\/etc\/hosts"/,$p' "$OUT/p08-ip6.strace"
    echo "== three lookups of localhost in one process: the files opened, from the first lookup on"
    strace -e trace=openat -o "$OUT/p08-three.strace" "$OUT/p08_gai" show localhost localhost localhost > /dev/null
    sed -n '/nsswitch.conf/,$p' "$OUT/p08-three.strace"
    echo "== the first getaddrinfo(\"127.0.0.1\") in Python: files opened during the call"
    strace -e trace=openat -o "$OUT/p08-numeric.strace" "$PY" p08_gai.py show 127.0.0.1 > /dev/null
    grep -E 'idna|stringprep|unicodedata|nsswitch|/etc/hosts' "$OUT/p08-numeric.strace"
  } > "$RES/p08-strace.txt"
  for run in 1 2 3; do
    echo "== run $run, C, $(load)"
    "$OUT/p08_gai" time 1000 127.0.0.1 localhost ip6-localhost @hostname
    echo "== run $run, Python, $(load)"
    "$PY" p08_gai.py time 1000 127.0.0.1 localhost ip6-localhost @hostname
  done > "$RES/p08-time.txt"
  {
    echo "== loop.getaddrinfo under strace -f: the thread that opens the files"
    strace -f -e trace=openat -e signal=none -o "$OUT/p08-asyncio.strace" "$PY" p08_gai.py asyncio
    grep -E '"/etc/(hosts|nsswitch.conf)"' "$OUT/p08-asyncio.strace"
    echo "== loop.getaddrinfo in asyncio/base_events.py of this Python"
    sed -n '/    async def getaddrinfo/,/flags)$/p' "$("$PY" -c 'import asyncio.base_events as b; print(b.__file__)')"
  } > "$RES/p08-asyncio.txt"
  {
    echo "== create_connection to localhost under strace, the server listens on 127.0.0.1 only"
    strace -e trace=socket,connect -o "$OUT/p08-connect.strace" "$PY" p08_gai.py connect 21081 > /dev/null
    grep -E 'AF_INET' "$OUT/p08-connect.strace"
    echo "== the same without strace, $(load)"
    "$PY" p08_gai.py connecttime 21082 200
  } > "$RES/p08-connect.txt"
}

# Traces the hostname lookup in C and in Python into out/, then counts DNS lines and
# non-loopback connects in every trace of this part.
p08_dnscheck() {
  [ -x "$OUT/p08_gai" ] || gcc -O2 -Wall -Wextra -o "$OUT/p08_gai" p08_gai.c
  strace -e trace=openat,socket,connect,bind,sendto -o "$OUT/p08-hostname.strace" "$OUT/p08_gai" show @hostname > /dev/null
  strace -e trace=openat,socket,connect,bind,sendto -o "$OUT/p08-hostname-py.strace" "$PY" p08_gai.py show @hostname > /dev/null
  {
    echo "== the straces of this part in out/"
    ls "$OUT"/p08-*.strace | sed 's|.*/||'
    echo "== lines with port 53 in all the straces of this part"
    cat "$OUT"/p08-*.strace | grep -c 'htons(53)' || true
    echo "== connect() calls to an address that is not 127.0.0.1 or ::1 in these straces"
    cat "$OUT"/p08-*.strace | grep 'connect(' | grep -E 'sin_addr|sin6_addr' | grep -vcE '127\.0\.0\.1|"::1"' || true
  } > "$RES/p08-dnscheck.txt"
}

p08_modules() {
  {
    echo "== NSS modules for hosts installed in /usr/lib"
    ls /usr/lib/libnss_*.so.2 | grep -E 'files|dns|mymachines|mdns_minimal|resolve|myhostname'
  } > "$RES/p08-modules.txt"
}

p08_libc() {
  {
    echo "== nm -D /usr/lib/libc.so.6: lines with _nss_files_"
    nm -D /usr/lib/libc.so.6 | grep -c _nss_files_ || true
    echo "== the same lines with the type T, a function defined in this file"
    nm -D /usr/lib/libc.so.6 | grep ' T ' | grep -c _nss_files_ || true
    echo "== the ones for host names, without the address"
    nm -D /usr/lib/libc.so.6 | grep '_nss_files_gethost' | sed 's/^[0-9a-f]* //'
    echo "== nm -D --defined-only /usr/lib/libnss_files.so.2, without the address"
    nm -D --defined-only /usr/lib/libnss_files.so.2 | sed 's/^[0-9a-f]* //'
  } > "$RES/p08-libc.txt"
}

part8() {
  p08_gai
  p08_dnscheck
  p08_modules
  p08_libc
}

make_cert() {
  case "$1" in
    rsa) newkey="-newkey rsa:2048" ;;
    ec) newkey="-newkey ec -pkeyopt ec_paramgen_curve:prime256v1" ;;
  esac
  openssl req -x509 $newkey -keyout "$OUT/$1-key.pem" -out "$OUT/$1-cert.pem" -days 365 -nodes \
    -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2> /dev/null
  echo "$1: $(openssl x509 -in "$OUT/$1-cert.pem" -noout -text | grep 'Public Key Algorithm' | sed 's/^ *//'), $(openssl x509 -in "$OUT/$1-cert.pem" -outform der | wc -c) bytes in DER"
}

p09_tls() {
  {
    echo "== two self-signed certificates for localhost and 127.0.0.1, made with openssl req in out/"
    make_cert rsa
    make_cert ec
  } > "$RES/p09-certs.txt"
  start_bg "$OUT/p09-rsa.log" "$PY" p09_tls.py server 21091 "$OUT/rsa-cert.pem" "$OUT/rsa-key.pem" nodelay
  rsa_server=$BG
  start_bg "$OUT/p09-ec.log" "$PY" p09_tls.py server 21092 "$OUT/ec-cert.pem" "$OUT/ec-key.pem" nodelay
  ec_server=$BG
  start_bg "$OUT/p09-nagle.log" "$PY" p09_tls.py server 21093 "$OUT/rsa-cert.pem" "$OUT/rsa-key.pem"
  nagle_server=$BG
  {
    for groups in default X25519; do
      echo "== openssl s_client to the Python server with the RSA certificate, groups: $groups"
      if [ "$groups" = default ]; then group_opt=""; else group_opt="-groups $groups"; fi
      openssl s_client -connect 127.0.0.1:21091 -servername localhost -CAfile "$OUT/rsa-cert.pem" $group_opt \
        < /dev/null 2> /dev/null | grep -E '^(Protocol|New,|Negotiated|Peer Temp Key|Peer signature type|SSL handshake|Verification)'
    done
  } > "$RES/p09-sclient.txt"
  {
    echo "== the server sends 1 byte right after the handshake, without TCP_NODELAY on the server"
    "$PY" p09_tls.py firstbyte 21093 "$OUT/rsa-cert.pem" 50
    echo "== the same, the server sets TCP_NODELAY"
    "$PY" p09_tls.py firstbyte 21091 "$OUT/rsa-cert.pem" 50
  } > "$RES/p09-firstbyte.txt"
  for run in 1 2 3; do
    echo "== run $run"
    "$PY" p09_tls.py client 21091 "$OUT/rsa-cert.pem" 300
    "$PY" p09_tls.py client 21092 "$OUT/ec-cert.pem" 300
  done > "$RES/p09-cost.txt"
  {
    echo "== the TLS records of one full and one resumed handshake, RSA certificate"
    strace -s 65535 -xx -e trace=socket,connect,read,write,close -o "$OUT/p09-once.strace" \
      "$PY" p09_tls.py once 21091 "$OUT/rsa-cert.pem"
    "$PY" p09_tls.py records "$OUT/p09-once.strace"
    echo "== the same with the ECDSA certificate"
    strace -s 65535 -xx -e trace=socket,connect,read,write,close -o "$OUT/p09-once-ec.strace" \
      "$PY" p09_tls.py once 21092 "$OUT/ec-cert.pem"
    "$PY" p09_tls.py records "$OUT/p09-once-ec.strace"
  } > "$RES/p09-records.txt"
  stop_bg "$rsa_server" "$ec_server" "$nagle_server"
  {
    echo "== openssl speed, one thread, $(load)"
    openssl speed -seconds 1 rsa2048 ecdsap256 2> /dev/null | grep -E '^ *(rsa2048|256 bits ecdsa)|sign/s'
    openssl speed -seconds 1 ecdhx25519 2> /dev/null | grep -E 'X25519|op/s'
    openssl speed -seconds 1 X25519MLKEM768 2> /dev/null | grep -E 'X25519MLKEM768|keygens/s'
  } > "$RES/p09-speed.txt"
}

part9() {
  p09_tls
}

p10_pool() {
  [ -f "$OUT/rsa-cert.pem" ] || make_cert rsa > /dev/null
  start_bg "$OUT/p10-plain.log" "$PY" p10_pool.py server 21101
  plain_server=$BG
  start_bg "$OUT/p10-nodelay.log" "$PY" p10_pool.py server 21102 nodelay
  nodelay_server=$BG
  start_bg "$OUT/p10-tls.log" "$PY" p10_pool.py server 21103 nodelay tls
  tls_server=$BG
  {
    echo "== the server of http.server as it is"
    "$PY" p10_pool.py bench 21101 1000
    echo "== the same server with TCP_NODELAY on each connection"
    "$PY" p10_pool.py bench 21102 1000
    echo "== HTTPS, the server with TCP_NODELAY"
    "$PY" p10_pool.py bench 21103 1000 tls
  } > "$RES/p10-bench.txt"
  stop_bg "$plain_server" "$nodelay_server" "$tls_server"
}

p10_stale() {
  [ -f "$OUT/rsa-cert.pem" ] || make_cert rsa > /dev/null
  start_bg "$OUT/p10-idle.log" "$PY" p10_pool.py server 21104 nodelay timeout=1
  idle_server=$BG
  start_bg "$OUT/p10-idle-tls.log" "$PY" p10_pool.py server 21105 nodelay tls timeout=1
  idle_tls_server=$BG
  {
    echo "== HTTP, the server closes the connections that are idle for 1 s"
    "$PY" p10_pool.py stale 21104
    echo "== HTTPS, the same"
    "$PY" p10_pool.py stale 21105 tls
  } > "$RES/p10-stale.txt"
  "$PY" p10_pool.py retry 21104 > "$RES/p10-retry.txt"
  stop_bg "$idle_server" "$idle_tls_server"
}

p10_tlsclose() {
  [ -f "$OUT/rsa-cert.pem" ] || make_cert rsa > /dev/null
  {
    echo "== the HTTPS server under strace -f -s 0, one request, then the client closes"
    strace -f -s 0 -e trace=read,write,shutdown,close -o "$OUT/p10-tlsclose.strace" \
      "$PY" p10_pool.py server 21106 nodelay tls > "$OUT/p10-tlsclose.log" 2>&1 &
    tracer=$!
    PIDS="$PIDS $tracer"
    wait_for_line "$OUT/p10-tlsclose.log" ready
    "$PY" p10_pool.py one 21106 tls
    kill "$(sed -n 's/.*pid \([0-9]*\)$/\1/p' "$OUT/p10-tlsclose.log")"
    wait "$tracer" || true
    forget "$tracer"
    echo "-- the system calls of the server from the end of file on"
    awk '/read\([0-9]+, "", 5\) *= 0$/ {found = 1} found' "$OUT/p10-tlsclose.strace" | sed 's/^[0-9]* *//' | head -4
  } > "$RES/p10-tlsclose.txt"
}

part10() {
  p10_pool
  p10_stale
  p10_tlsclose
}

run_part() {
  case "$1" in
    1) part1 ;;
    2) part2 ;;
    3) part3 ;;
    4) part4 ;;
    5) part5 ;;
    6) part6 ;;
    7) part7 ;;
    8) part8 ;;
    9) part9 ;;
    10) part10 ;;
    p0[1-9]_* | p10_*) "$1" ;;
    *) echo "unknown part $1" >&2; exit 1 ;;
  esac
}

if [ "$#" -eq 0 ]; then
  for p in 1 2 3 4 5 6 7 8 9 10; do
    run_part "$p"
  done
else
  run_part "$1"
fi
