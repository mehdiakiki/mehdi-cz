fn main() {
    let value = std::hint::black_box(u8::MAX);
    println!("{}", value.wrapping_add(1));
}
