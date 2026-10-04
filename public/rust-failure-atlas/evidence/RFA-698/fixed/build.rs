fn main() {
    let output = std::path::PathBuf::from(
        std::env::var_os("OUT_DIR").expect("Cargo supplies OUT_DIR"),
    );
    std::fs::write(
        output.join("generated.rs"),
        "pub const GENERATED: u32 = 41;\n",
    )
    .expect("write generated file");
}
