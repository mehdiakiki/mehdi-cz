"""Fixed harmless shell marker and a dummy converter, not arbitrary commands."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import subprocess
import sys


CONVERTER = """
import argparse, json
parser = argparse.ArgumentParser()
parser.add_argument('--format', choices=['txt', 'json'], required=True)
parser.add_argument('input_name')
args = parser.parse_args()
print(json.dumps({'format': args.format, 'input_name': args.input_name}))
"""


def converter_arguments(input_name: str, output_format: str) -> list[str]:
    if output_format not in {"txt", "json"}:
        raise ValueError("unsupported format")
    # This particular fixed argparse program documents/supports '--'. Other
    # executables need their own option rules; it is not a universal separator.
    return [sys.executable, "-I", "-c", CONVERTER,
            "--format", output_format, "--", input_name]


def demonstrate() -> None:
    if os.name != "posix":
        raise SystemExit("This shell fixture is for POSIX.")
    value = "notes; printf DEMO > marker.txt"
    with TemporaryDirectory(prefix="agent-arguments-") as directory:
        root = Path(directory)
        subprocess.run(
            "printf '%s' " + value,
            shell=True,
            cwd=root,
            env={"PATH": os.defpath},
            stdout=subprocess.DEVNULL,
            timeout=5,
            check=True,
        )
        marker = root / "marker.txt"
        assert marker.read_text() == "DEMO"
        marker.unlink()
        result = subprocess.run(
            [sys.executable, "-I", "-c", "import sys; print(sys.argv[1])", value],
            shell=False,
            cwd=root,
            env={"PATH": os.defpath},
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
        assert result.stdout.strip() == value
        assert not marker.exists()
        for name in [value, "quarterly report.txt", "--help"]:
            converted = subprocess.run(
                converter_arguments(name, "txt"),
                shell=False, cwd=root, env={"PATH": os.defpath},
                capture_output=True, text=True, timeout=5, check=True,
            )
            assert json.loads(converted.stdout) == {"format": "txt", "input_name": name}
            assert not marker.exists()
        try:
            converter_arguments("input.txt", "executable")
        except ValueError:
            pass
        else:
            raise AssertionError("unsupported format reached process creation")
        print("Literal semicolon, spaces, and leading '--help' survived the fixed converter. Unsupported format was rejected before launch.")


if __name__ == "__main__":
    demonstrate()
