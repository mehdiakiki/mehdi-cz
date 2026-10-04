fn main() {
    let seed: u64 = std::env::args().count() as u64;
    println!("{}", app::total(seed));
}
