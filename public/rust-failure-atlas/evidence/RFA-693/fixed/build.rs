fn main() {
    let target = std::env::var("TARGET").expect("Cargo supplies TARGET when the build script runs");
    println!("cargo::warning=building for {target}");
}
