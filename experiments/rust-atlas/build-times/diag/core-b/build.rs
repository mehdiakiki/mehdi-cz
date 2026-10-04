// Declares exactly what this build script depends on.
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
