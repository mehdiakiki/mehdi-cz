fn main() {
    std::fs::write("generated.rs", "pub const GENERATED: u32 = 41;\n")
        .expect("write generated file");
}
