// Prints the target the binary was compiled for.
fn main() {
    println!(
        "hello from {}-{}-{}",
        std::env::consts::ARCH,
        std::env::consts::OS,
        if cfg!(target_env = "musl") { "musl" } else { "gnu" }
    );
}
