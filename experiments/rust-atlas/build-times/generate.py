#!/usr/bin/env python3
"""Generate three Cargo workspaces that contain the same code split differently.

split-1   -> one library crate holding every module
split-3   -> three library crates, four modules each
split-12  -> twelve library crates, one module each

Every variant also contains a `shared` crate with one generic-heavy function.
The generic body is instantiated by every module, so the number of downstream
crates changes how many times that body is monomorphized and codegen'd.

Usage:
    python3 generate.py            -> regenerate split-1, split-3, split-12
"""

import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent

MODULES = 12
OPS_PER_MODULE = 8
ROUNDS = 1500

# Types declared in `shared` and instantiated by every module. These are the
# duplicated ones -> one copy per crate that uses them, not one per workspace.
COMMON_OPS = 16

# --------------------------------------------------------------------------
# shared crate: one generic function with a body large enough that each
# instantiation costs real codegen time.
# --------------------------------------------------------------------------

SHARED_CARGO = """[package]
name = "shared"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
path = "src/lib.rs"
"""


def shared_lib() -> str:
    lines = [
        "//! Generic-heavy helper. Each `transform::<T>` instantiation is codegen'd",
        "//! in the crate that calls it, not in this crate.",
        "",
        "pub trait Op {",
        "    const SALT: u64;",
        "    fn step(x: u64) -> u64;",
        "}",
        "",
        "#[inline(never)]",
        "pub fn transform<T: Op>(seed: u64) -> u64 {",
        "    let mut acc = seed ^ T::SALT;",
    ]
    for i in range(ROUNDS):
        lines.append(f"    acc = T::step(acc).wrapping_mul(0x{(0x9E3779B97F4A7C15 + i) & 0xFFFFFFFFFFFFFFFF:016X});")
        lines.append(f"    acc ^= acc >> {17 + (i % 13)};")
        lines.append(f"    acc = acc.wrapping_add(T::SALT ^ {i});")
        lines.append(f"    acc = acc.rotate_left({(i * 7) % 63 + 1});")
    lines.append("    acc")
    lines.append("}")
    lines.append("")
    for j in range(COMMON_OPS):
        salt = 7_000_003 + j * 131
        lines += [
            f"pub struct C{j:02};",
            f"impl Op for C{j:02} {{",
            f"    const SALT: u64 = {salt};",
            "    #[inline]",
            "    fn step(x: u64) -> u64 {",
            f"        x.wrapping_mul(5).wrapping_add({salt}) ^ (x >> {(j % 9) + 4})",
            "    }",
            "}",
            "",
        ]
    return "\n".join(lines)


# --------------------------------------------------------------------------
# generated modules
# --------------------------------------------------------------------------


def module_source(index: int) -> str:
    lines = [
        f"//! Generated module {index:02}. Do not edit by hand, see generate.py.",
        "",
        "use shared::{transform, Op};",
        "",
    ]
    for op in range(OPS_PER_MODULE):
        name = f"Op{index:02}{op:02}"
        salt = (index * 1_000_003 + op * 7919 + 1) & 0xFFFFFFFF
        lines += [
            f"pub struct {name};",
            f"impl Op for {name} {{",
            f"    const SALT: u64 = {salt};",
            "    #[inline]",
            "    fn step(x: u64) -> u64 {",
            f"        x.wrapping_mul(3).wrapping_add({salt}) ^ (x >> {(op % 11) + 3})",
            "    }",
            "}",
            "",
        ]
    lines += [
        "pub fn run(seed: u64) -> u64 {",
        "    let mut acc = seed;",
    ]
    for op in range(OPS_PER_MODULE):
        lines.append(f"    acc = acc.wrapping_add(transform::<Op{index:02}{op:02}>(acc));")
    for j in range(COMMON_OPS):
        lines.append(f"    acc = acc.wrapping_add(transform::<shared::C{j:02}>(acc));")
    lines += [
        "    acc",
        "}",
        "",
    ]
    return "\n".join(lines)


def leaf_cargo(name: str) -> str:
    return f"""[package]
name = "{name}"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
path = "src/lib.rs"

[dependencies]
shared = {{ path = "../shared" }}
"""


def app_cargo(name: str, deps: list[str]) -> str:
    dep_lines = "\n".join(f'{dep} = {{ path = "../{dep}" }}' for dep in deps)
    return f"""[package]
name = "{name}"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
path = "src/lib.rs"

[dependencies]
{dep_lines}
"""


def workspace_cargo(members: list[str]) -> str:
    member_lines = "\n".join(f'    "{member}",' for member in members)
    return f"""[workspace]
resolver = "2"
members = [
{member_lines}
]

[profile.dev]
debug = false
"""


MAIN_RS = """fn main() {
    let seed: u64 = std::env::args().count() as u64;
    println!("{}", app::total(seed));
}
"""


def write(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def emit_shared(base: pathlib.Path) -> None:
    write(base / "shared" / "Cargo.toml", SHARED_CARGO)
    write(base / "shared" / "src" / "lib.rs", shared_lib())


def build_split_1() -> None:
    base = ROOT / "split-1"
    shutil.rmtree(base, ignore_errors=True)
    emit_shared(base)

    mods = [f"m{i:02}" for i in range(MODULES)]
    lib = ["//! Generated root. Do not edit by hand, see generate.py.", ""]
    lib += [f"pub mod {name};" for name in mods]
    lib += ["", "pub fn total(seed: u64) -> u64 {", "    let mut acc = seed;"]
    lib += [f"    acc ^= {name}::run(acc);" for name in mods]
    lib += ["    acc", "}", ""]

    write(base / "app" / "Cargo.toml", app_cargo("app", ["shared"]))
    write(base / "app" / "src" / "lib.rs", "\n".join(lib))
    write(base / "app" / "src" / "main.rs", MAIN_RS)
    for i, name in enumerate(mods):
        write(base / "app" / "src" / f"{name}.rs", module_source(i))
    write(base / "Cargo.toml", workspace_cargo(["shared", "app"]))


def build_split_n(count: int, folder: str) -> None:
    base = ROOT / folder
    shutil.rmtree(base, ignore_errors=True)
    emit_shared(base)

    per_crate = MODULES // count
    crates = []
    for c in range(count):
        crate = f"part{c:02}"
        crates.append(crate)
        mods = [f"m{i:02}" for i in range(c * per_crate, (c + 1) * per_crate)]
        lib = [f"//! Generated crate {crate}. Do not edit by hand, see generate.py.", ""]
        lib += [f"pub mod {name};" for name in mods]
        lib += ["", "pub fn part(seed: u64) -> u64 {", "    let mut acc = seed;"]
        lib += [f"    acc ^= {name}::run(acc);" for name in mods]
        lib += ["    acc", "}", ""]
        write(base / crate / "Cargo.toml", leaf_cargo(crate))
        write(base / crate / "src" / "lib.rs", "\n".join(lib))
        for name in mods:
            write(base / crate / "src" / f"{name}.rs", module_source(int(name[1:])))

    app = ["//! Generated root. Do not edit by hand, see generate.py.", ""]
    app += [f"use {crate};" for crate in crates]
    app += ["", "pub fn total(seed: u64) -> u64 {", "    let mut acc = seed;"]
    app += [f"    acc ^= {crate}::part(acc);" for crate in crates]
    app += ["    acc", "}", ""]
    write(base / "app" / "Cargo.toml", app_cargo("app", crates))
    write(base / "app" / "src" / "lib.rs", "\n".join(app))
    write(base / "app" / "src" / "main.rs", MAIN_RS)
    write(base / "Cargo.toml", workspace_cargo(["shared", *crates, "app"]))


DIAG_FILES: dict[str, str] = {
    "Cargo.toml": '''[workspace]
resolver = "2"
members = ["core-a", "core-b", "app"]

[profile.dev]
debug = false
''',
    "core-a/Cargo.toml": '''[package]
name = "core-a"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
path = "src/lib.rs"

[features]
default = []
fast = []
''',
    "core-a/src/lib.rs": '''//! Small library with one optional feature and one compile-time env read.

/// Read at compile time -> Cargo records it as an env dependency of this unit.
pub const TAG: &str = match option_env!("DIAG_TAG") {
    Some(value) => value,
    None => "unset",
};

pub fn width() -> usize {
    if cfg!(feature = "fast") {
        64
    } else {
        16
    }
}

pub fn label() -> String {
    format!("core-a tag={TAG} width={}", width())
}
''',
    "core-b/Cargo.toml": '''[package]
name = "core-b"
version = "0.1.0"
edition = "2021"
publish = false
build = "build.rs"

[lib]
path = "src/lib.rs"

[dependencies]
core-a = { path = "../core-a" }
''',
    "core-b/build.rs": '''// Declares exactly what this build script depends on.
// `schema/table.txt` is part of the fixture. Delete it to reproduce the
// "rerun-if-changed points at a missing file" case -> the script reruns on
// every build.
fn main() {
    println!("cargo::rerun-if-changed=build.rs");
    println!("cargo::rerun-if-changed=schema/table.txt");
    println!("cargo::rerun-if-env-changed=DIAG_TAG");
    println!("cargo::rustc-check-cfg=cfg(schema_present)");
    if std::path::Path::new("schema/table.txt").exists() {
        println!("cargo::rustc-cfg=schema_present");
    }
}
''',
    "core-b/schema/table.txt": "id\tname\n1\talpha\n2\tbeta\n",
    "core-b/src/lib.rs": '''//! Depends on core-a and on a build script.

pub fn describe() -> String {
    let schema = if cfg!(schema_present) { "present" } else { "missing" };
    format!("core-b schema={schema} <- {}", core_a::label())
}
''',
    "app/Cargo.toml": '''[package]
name = "app"
version = "0.1.0"
edition = "2021"
publish = false

[[bin]]
name = "app"
path = "src/main.rs"

[dependencies]
core-a = { path = "../core-a", features = ["fast"] }
core-b = { path = "../core-b" }
''',
    "app/src/main.rs": '''fn main() {
    println!("{}", core_b::describe());
    println!("{}", core_a::label());
}
''',
}


def build_diag() -> None:
    """Tiny workspace used for the rebuild-trigger experiments."""
    base = ROOT / "diag"
    target = base / "target"
    keep_target = target.exists()
    for path in sorted(base.glob("*")):
        if keep_target and path == target:
            continue
        shutil.rmtree(path) if path.is_dir() else path.unlink()
    for name, text in DIAG_FILES.items():
        write(base / name, text)


def main() -> None:
    build_split_1()
    build_split_n(3, "split-3")
    build_split_n(12, "split-12")
    build_diag()
    print("generated split-1, split-3, split-12, diag")


if __name__ == "__main__":
    main()
