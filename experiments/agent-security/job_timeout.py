"""Linux-only bounded leader/descendant checks; no cgroup or privilege changes."""
import os
import json
import select
import signal
import subprocess
import sys
import time
from typing import Callable


def finish_group(
    child: subprocess.Popen,
    timeout: float,
    cancelled: Callable[[], bool] = lambda: False,
) -> tuple[str, int]:
    """One waiter owns the leader. Cooperative descendants stay in its group."""
    deadline = time.monotonic() + timeout
    reason = "timeout"
    try:
        while True:
            if cancelled():
                reason = "cancelled"
                break
            exited = os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            if exited is not None:
                reason = "completed"
                break
            if time.monotonic() >= deadline:
                break
            time.sleep(0.005)
    finally:
        # WNOWAIT leaves the leader waitable: do not call poll()/wait() before
        # addressing its group. Normal exit also takes this cleanup path.
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        code = child.wait(timeout=5)
    return reason, code


LEADER = """
import subprocess, sys
worker = subprocess.Popen(
    [sys.executable, '-I', '-c', 'import time; time.sleep(8)'],
    close_fds=True, stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
print(worker.pid, flush=True)
# Keep ownership of the unreaped worker until the parent has acquired its pidfd.
# Even if the bounded worker exits meanwhile, its PID cannot be reused while
# this leader retains the waitable child. A closed pipe handles parent failure.
if sys.stdin.buffer.read(1) != b'R':
    worker.kill()
    worker.wait(timeout=5)
    raise SystemExit(1)
if sys.argv[1] == 'wait':
    worker.wait()
"""


def read_worker_pid(child: subprocess.Popen) -> int:
    """Bounded readiness handshake, before the measured timeout begins."""
    assert child.stdout is not None
    deadline = time.monotonic() + 5
    value = b""
    while b"\n" not in value and len(value) < 64:
        remaining = deadline - time.monotonic()
        if remaining <= 0 or not select.select([child.stdout], [], [], remaining)[0]:
            raise AssertionError("fixed leader did not report its child")
        chunk = os.read(child.stdout.fileno(), 64 - len(value))
        if not chunk:
            raise AssertionError("fixed leader closed its readiness pipe")
        value += chunk
    if not value.endswith(b"\n"):
        raise AssertionError("invalid readiness message")
    return int(value)


def exited(pidfd: int, timeout_ms: int = 0) -> bool:
    poller = select.poll()
    poller.register(pidfd, select.POLLIN)
    return bool(poller.poll(timeout_ms))


def check_case(name: str, mode: str) -> dict:
    child = subprocess.Popen(
        [sys.executable, "-I", "-c", LEADER, mode],
        start_new_session=True, close_fds=True, env={"PATH": os.defpath},
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    worker_fd = None
    try:
        candidate_fd = os.pidfd_open(read_worker_pid(child))
        try:
            # A live fixed leader is still holding the worker unreaped. If the
            # leader unexpectedly died before acquisition, do not signal a
            # handle acquired from its now-untrusted reported PID.
            leader_exit = os.waitid(
                os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT
            )
            assert leader_exit is None, "leader exited before pidfd handoff"
            worker_fd = candidate_fd
        finally:
            if worker_fd is None:
                os.close(candidate_fd)
        assert not exited(worker_fd), "bounded worker exited before observation"
        assert child.stdin is not None
        child.stdin.write(b"R")
        child.stdin.flush()
        child.stdin.close()
        if name == "leader-only":
            assert child.wait(timeout=5) == 0
            assert not exited(worker_fd)
            return {"case": name, "descendant_running_after_return": True}
        if name == "launcher-error":
            def fail() -> bool:
                raise RuntimeError("dummy launcher error")
            try:
                finish_group(child, 2, fail)
            except RuntimeError as error:
                assert str(error) == "dummy launcher error"
            else:
                raise AssertionError("launcher failure disappeared")
            reason = "launcher-error"
        else:
            reason, code = finish_group(child, 0.1 if name == "timeout" else 2,
                                        cancelled=lambda: name == "cancelled")
            assert reason == name
            if name == "completed":
                assert code == 0
        # A pidfd identifies the same process even if a numeric PID is reused.
        # Readability observes termination, including an unreaped zombie.
        assert exited(worker_fd, 5000), "descendant did not terminate"
        return {"case": name, "descendant_running_after_return": False}
    finally:
        # Fixture backstop: target only its known worker via pidfd, never a
        # saved group number after the leader has been reaped.
        if worker_fd is not None:
            try:
                signal.pidfd_send_signal(worker_fd, signal.SIGKILL)
            except ProcessLookupError:
                pass
            assert exited(worker_fd, 5000)
            os.close(worker_fd)
        if child.returncode is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait(timeout=5)
        if child.stdout is not None:
            child.stdout.close()
        if child.stdin is not None and not child.stdin.closed:
            child.stdin.close()


def demonstrate() -> None:
    if not sys.platform.startswith("linux") or not hasattr(os, "pidfd_open"):
        raise SystemExit("This check requires Linux pidfds and waitid(WNOWAIT).")
    observations = [check_case("leader-only", "exit")]
    for name, mode in [("completed", "exit"), ("timeout", "wait"),
                       ("cancelled", "wait"), ("launcher-error", "wait")]:
        observations.append(check_case(name, mode))
    print(json.dumps(observations, sort_keys=True))


if __name__ == "__main__":
    demonstrate()
