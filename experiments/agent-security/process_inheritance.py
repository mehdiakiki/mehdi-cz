"""POSIX fixture: a dummy secret and file descriptor, never real credentials."""
import json
import os
import subprocess
import sys
import tempfile


def observe_child(fd: int, *, guarded: bool) -> dict:
    code = """
import json, os, sys
try:
    value = os.read(int(sys.argv[1]), 32).decode()
except OSError:
    value = None
print(json.dumps({"secret": os.environ.get("DEMO_SECRET"), "descriptor": value}))
"""
    environment = {"LANG": "C.UTF-8"}
    if not guarded:
        environment["DEMO_SECRET"] = "fake-token-not-a-credential"
    result = subprocess.run(
        [sys.executable, "-I", "-c", code, str(fd)],
        env=environment,
        close_fds=guarded,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=5,
        check=True,
    )
    return json.loads(result.stdout)


def demonstrate() -> None:
    if os.name != "posix":
        raise SystemExit("This descriptor-inheritance fixture is for POSIX.")
    with tempfile.TemporaryFile() as fixture:
        fixture.write(b"dummy-open-file")
        fixture.seek(0)
        os.set_inheritable(fixture.fileno(), True)
        inherited = observe_child(fixture.fileno(), guarded=False)
        blocked = observe_child(fixture.fileno(), guarded=True)
        assert inherited["secret"] == "fake-token-not-a-credential"
        assert inherited["descriptor"] == "dummy-open-file"
        assert blocked == {"secret": None, "descriptor": None}
        print(json.dumps({"first_launch": inherited, "reduced_launch": blocked}, sort_keys=True))


if __name__ == "__main__":
    demonstrate()
