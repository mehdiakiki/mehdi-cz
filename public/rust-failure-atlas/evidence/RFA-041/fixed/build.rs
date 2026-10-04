use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    let host = env::var("HOST").expect("the harness must provide HOST");
    let target = env::var("TARGET").expect("the harness must provide TARGET");
    let compiler = env::var("CC").expect("the harness must provide CC");
    let target_flag = format!("--target={target}");
    let object = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is required"))
        .join("native.o");

    // This reduced fixture forwards Cargo's target triple to a compiler which
    // supports the same target spelling.
    let status = Command::new(&compiler)
        .arg(&target_flag)
        .args(["-c", "native/add.c", "-o"])
        .arg(&object)
        .status()
        .expect("could not start the native compiler");
    assert!(status.success(), "native compiler failed");

    println!(
        "HOST={host} TARGET={target} compiler={compiler} flags={target_flag} object={}",
        object.display()
    );
}
