fn main() {
    println!("cargo::rustc-check-cfg=cfg(has_fast_path)");
    println!("cargo::rustc-cfg=has_fast_path");
}
