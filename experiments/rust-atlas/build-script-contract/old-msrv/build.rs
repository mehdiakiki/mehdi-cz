fn main() {
    println!("cargo:rerun-if-env-changed=BUILD_LINE");
    if let Ok(line) = std::env::var("BUILD_LINE") {
        println!("{line}");
    }
}
