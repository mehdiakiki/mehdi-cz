use std::env;
use std::path::PathBuf;
use std::process::Command;

fn checked(command: &mut Command) {
    let rendered = format!("{command:?}");
    let status = command.status().unwrap_or_else(|error| {
        panic!("could not start {rendered}: {error}");
    });
    assert!(status.success(), "native command failed: {rendered}");
}

fn main() {
    let output = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo must provide OUT_DIR"));
    let object = output.join("status.o");
    let archive = output.join("librfa_status.a");

    checked(
        Command::new("cc")
            .arg("-std=c11")
            .arg("-c")
            .arg("native/status.c")
            .arg("-o")
            .arg(&object),
    );
    checked(Command::new("ar").arg("crs").arg(&archive).arg(&object));

    println!("cargo:rustc-link-search=native={}", output.display());
    println!("cargo:rustc-link-lib=static=rfa_status");
    println!("cargo:rerun-if-changed=native/status.c");
}
