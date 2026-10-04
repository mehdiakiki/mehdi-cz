fn main() {
    println!("compiled={}", env!("RFA_BUILD_LABEL"));
    println!(
        "runtime={}",
        std::env::var("RFA_BUILD_LABEL").unwrap_or_else(|_| "missing".to_owned())
    );
}
