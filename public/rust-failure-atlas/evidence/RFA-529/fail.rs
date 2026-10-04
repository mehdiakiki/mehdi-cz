fn main() {
    let small = 1_u32;
    let mut large = 2_u64;
    large = large + small.into();
    println!("{large}");
}
