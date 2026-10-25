"""Runs a command with transparent huge pages left as they are, or turned off for it.

Usage: python3 -I thp.py default|off COMMAND...
"off" calls prctl(PR_SET_THP_DISABLE), which the command keeps after execve.
"""

import ctypes
import os
import sys

PR_SET_THP_DISABLE = 41


def main():
    mode, argv = sys.argv[1], sys.argv[2:]
    if mode == "off":
        libc = ctypes.CDLL(None, use_errno=True)
        if libc.prctl(PR_SET_THP_DISABLE, 1, 0, 0, 0) != 0:
            sys.exit(f"prctl failed: {os.strerror(ctypes.get_errno())}")
    elif mode != "default":
        sys.exit(f"unknown mode {mode}")
    os.execvp(argv[0], argv)


if __name__ == "__main__":
    main()
