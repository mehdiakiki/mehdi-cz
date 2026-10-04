use std::{env, fs, path::PathBuf};

fn main() {
    let mode = env::var("RFA_BUILD_MODE").unwrap_or_else(|_| "default".to_owned());
    let output = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo supplies OUT_DIR"));
    fs::write(
        output.join("mode.rs"),
        format!("pub const MODE: &str = {mode:?};\n"),
    )
    .expect("write generated mode");

    println!("cargo::rerun-if-changed=build.rs");
    println!("cargo::rerun-if-env-changed=RFA_BUILD_MODE");
}
