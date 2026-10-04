use std::{env, fs, path::PathBuf};

fn main() {
    let mode = env::var("RFA_BUILD_MODE").unwrap_or_else(|_| "default".to_owned());
    let output = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo supplies OUT_DIR"));
    fs::write(
        output.join("mode.rs"),
        format!("pub const MODE: &str = {mode:?};\n"),
    )
    .expect("write generated mode");

    // This narrows change detection but forgets the environment input above.
    println!("cargo::rerun-if-changed=build.rs");
}
