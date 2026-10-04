use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    let package_path = env::var("WIDGET_PKG_CONFIG_PATH").expect("package path is required");
    let output_directory = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is required"));
    let executable = output_directory.join("probe");

    let discovery = Command::new("pkg-config")
        .args(["--cflags", "--libs", "widget"])
        .env("PKG_CONFIG_PATH", &package_path)
        .env("PKG_CONFIG_LIBDIR", &package_path)
        .env_remove("PKG_CONFIG_SYSROOT_DIR")
        .output()
        .expect("could not start pkg-config");
    assert!(
        discovery.status.success(),
        "pkg-config failed: {}",
        String::from_utf8_lossy(&discovery.stderr)
    );
    let flags = String::from_utf8(discovery.stdout).expect("pkg-config output must be UTF-8");
    println!("coherent flags: {}", flags.trim());

    let status = Command::new("cc")
        .arg("probe.c")
        .args(flags.split_whitespace())
        .arg("-o")
        .arg(&executable)
        .status()
        .expect("could not compile the native probe");
    assert!(status.success(), "native probe did not link");

    let status = Command::new(executable)
        .status()
        .expect("could not run the native probe");
    assert!(status.success(), "coherent native installation failed");
}
