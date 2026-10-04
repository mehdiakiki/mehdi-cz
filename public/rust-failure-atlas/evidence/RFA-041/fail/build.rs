use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    let host = env::var("HOST").expect("the harness must provide HOST");
    let target = env::var("TARGET").expect("the harness must provide TARGET");
    let compiler = env::var("CC").expect("the harness must provide CC");
    let object = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is required"))
        .join("native.o");

    // This compiler invocation ignores TARGET. It succeeds, but emits a host
    // object which the target linker cannot consume.
    let status = Command::new(&compiler)
        .args(["-c", "native/add.c", "-o"])
        .arg(&object)
        .status()
        .expect("could not start the native compiler");
    assert!(status.success(), "native compiler failed");

    println!(
        "HOST={host} TARGET={target} compiler={compiler} flags=<none> object={}",
        object.display()
    );
}
