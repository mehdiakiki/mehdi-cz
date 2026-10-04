use std::env;
use std::path::PathBuf;
use std::process::{Command, Output};

fn discover(path: &str, arguments: &[&str]) -> Output {
    let output = Command::new("pkg-config")
        .args(arguments)
        .arg("widget")
        .env("PKG_CONFIG_PATH", path)
        .env("PKG_CONFIG_LIBDIR", path)
        .env_remove("PKG_CONFIG_SYSROOT_DIR")
        .output()
        .expect("could not start pkg-config");
    assert!(
        output.status.success(),
        "pkg-config failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    output
}

fn main() {
    let header_path = env::var("HEADER_PKG_CONFIG_PATH").expect("header path is required");
    let library_path = env::var("LIB_PKG_CONFIG_PATH").expect("library path is required");
    let output_directory = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is required"));
    let executable = output_directory.join("probe");

    let cflags = discover(&header_path, &["--cflags"]);
    let libraries = discover(&library_path, &["--libs"]);
    let cflags = String::from_utf8(cflags.stdout).expect("pkg-config cflags must be UTF-8");
    let libraries = String::from_utf8(libraries.stdout).expect("pkg-config libs must be UTF-8");
    println!("header flags: {}", cflags.trim());
    println!("library flags: {}", libraries.trim());

    let status = Command::new("cc")
        .arg("probe.c")
        .args(cflags.split_whitespace())
        .args(libraries.split_whitespace())
        .arg("-o")
        .arg(&executable)
        .status()
        .expect("could not compile the native probe");
    assert!(status.success(), "native probe did not link");

    let status = Command::new(executable)
        .status()
        .expect("could not run the native probe");
    assert!(status.success(), "native header/library versions diverged");
}
