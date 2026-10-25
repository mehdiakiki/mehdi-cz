"""A listening socket on 127.0.0.1 that runs in its own process.

usage: listener.py PORT BACKLOG MODE SECONDS
  MODE never   listen and never call accept
  MODE close   accept every connection and close it at once
The process prints one ready line and exits by itself after SECONDS.
"""

import signal
import sys

from tcplab import listen

port, backlog, mode, seconds = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], int(sys.argv[4])
signal.alarm(seconds)
ls = listen(port, backlog)
print(f"ready: listening on 127.0.0.1:{port}, backlog {backlog}, mode {mode}", flush=True)
if mode == "never":
    signal.pause()
else:
    while True:
        conn, _ = ls.accept()
        conn.close()
