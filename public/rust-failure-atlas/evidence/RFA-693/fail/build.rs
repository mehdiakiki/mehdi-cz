const TARGET: &str = env!("TARGET");

fn main() {
    println!("cargo::warning=building for {TARGET}");
}
