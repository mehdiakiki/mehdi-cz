#!/usr/bin/env python3
import base64
import hashlib
import os
import sys
import zipfile

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "hooks")

HOOK_MODULE = (
    "import os\n"
    "import sys\n"
    "\n"
    "\n"
    "def _record():\n"
    "    path = os.environ.get('STARTLOG_FILE')\n"
    "    if not path:\n"
    "        return\n"
    "    try:\n"
    "        with open(path, 'a', encoding='utf-8') as fh:\n"
    "            fh.write('pid=%d exe=%s argv=%s\\n'\n"
    "                     % (os.getpid(), sys.executable, ' '.join(sys.argv)))\n"
    "    except OSError:\n"
    "        pass\n"
    "\n"
    "\n"
    "_record()\n"
)

TINY_MODULE = "value = 1\n"


def record_line(arcname, data):
    digest = hashlib.sha256(data).digest()
    b64 = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return "%s,sha256=%s,%d" % (arcname, b64, len(data))


def build_wheel(path, dist, files, record_name):
    entries = []
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for arcname, text in files.items():
            data = text.encode("utf-8")
            zf.writestr(arcname, data)
            entries.append(record_line(arcname, data))
        entries.append("%s/RECORD,," % dist)
        zf.writestr("%s/RECORD" % record_name, "\n".join(entries) + "\n")


def metadata(name, version, summary):
    return (
        "Metadata-Version: 2.1\n"
        "Name: %s\n"
        "Version: %s\n"
        "Summary: %s\n" % (name, version, summary)
    )


WHEEL = "Wheel-Version: 1.0\nGenerator: make_wheels.py\nRoot-Is-Purelib: true\nTag: py3-none-any\n"


def main():
    os.makedirs(OUT, exist_ok=True)

    hook_dist = "startlog-0.0.1.dist-info"
    build_wheel(
        os.path.join(OUT, "startlog-0.0.1-py3-none-any.whl"),
        hook_dist,
        {
            "startlog.py": HOOK_MODULE,
            "startlog.pth": "import startlog\n",
            "%s/METADATA" % hook_dist: metadata(
                "startlog", "0.0.1", "A harmless startup hook for a demo."
            ),
            "%s/WHEEL" % hook_dist: WHEEL,
        },
        hook_dist,
    )

    tiny_dist = "tinydep-0.0.1.dist-info"
    build_wheel(
        os.path.join(OUT, "tinydep-0.0.1-py3-none-any.whl"),
        tiny_dist,
        {
            "tinydep.py": TINY_MODULE,
            "%s/METADATA" % tiny_dist: metadata(
                "tinydep", "0.0.1", "A tiny package to install in the demo."
            ),
            "%s/WHEEL" % tiny_dist: WHEEL,
        },
        tiny_dist,
    )

    for name in sorted(os.listdir(OUT)):
        print(name)


if __name__ == "__main__":
    main()
