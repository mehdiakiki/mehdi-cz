"""Read strace -f output into (pid, syscall, args, result) records."""

import re

CALL = re.compile(r"^(\d+) +(\w+)\((.*)\) += (-?\d+|\?)(?: (\w+) \(.*\))?")


def split_args(text):
    """Split the argument text of one call at top-level commas, keeping strings intact."""
    args, depth, current, i = [], 0, [], 0
    while i < len(text):
        ch = text[i]
        if ch == '"':
            end = i + 1
            while text[end] != '"':
                end += 2 if text[end] == "\\" else 1
            current.append(text[i:end + 1])
            i = end + 1
            continue
        if ch in "[{(":
            depth += 1
        elif ch in "]})":
            depth -= 1
        if ch == "," and depth == 0:
            args.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
        i += 1
    if current:
        args.append("".join(current).strip())
    return args


def unquote(arg):
    """Turn a strace string argument back into bytes; a trailing ... marks a cut string."""
    match = re.match(r'^"(.*)"(\.\.\.)?$', arg, re.S)
    if not match:
        return None
    raw, out, i = match.group(1), bytearray(), 0
    escapes = {"n": 10, "t": 9, "r": 13, "v": 11, "f": 12, '"': 34, "\\": 92}
    while i < len(raw):
        if raw[i] != "\\":
            out += raw[i].encode()
            i += 1
        elif raw[i + 1] == "x":
            out.append(int(raw[i + 2:i + 4], 16))
            i += 4
        elif raw[i + 1] in escapes:
            out.append(escapes[raw[i + 1]])
            i += 2
        else:
            digits = re.match(r"[0-7]{1,3}", raw[i + 1:]).group(0)
            out.append(int(digits, 8))
            i += 1 + len(digits)
    return bytes(out)


def records(path):
    """Yield (pid, name, args, result, error) for each finished call, joining unfinished and resumed lines."""
    pending = {}
    for line in open(path, encoding="utf-8", errors="replace"):
        line = line.rstrip("\n")
        match = re.match(r"^(\d+) +(.*) <unfinished \.\.\.>$", line)
        if match:
            pending[match.group(1)] = match.group(2)
            continue
        match = re.match(r"^(\d+) +<\.\.\. \w+ resumed>(.*)$", line)
        if match:
            line = f"{match.group(1)} {pending.pop(match.group(1))}{match.group(2)}"
        match = CALL.match(line)
        if match:
            pid, name, args, result, error = match.groups()
            yield pid, name, split_args(args), result, error
