# Each check asks the same question: is this compiler at least Rust 1.80?
for version in ["1.99.1", "1.100.0"]:
    print(f"== {version}")
    print("string >= '1.80.0'   ", version >= "1.80.0")
    major_minor = float(".".join(version.split(".")[:2]))
    print("float(major.minor)   ", major_minor, major_minor >= 1.80)
    parts = tuple(int(part) for part in version.split("."))
    print("tuple of ints        ", parts, parts >= (1, 80, 0))
