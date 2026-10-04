fn main() {
    let observed = std::panic::catch_unwind(|| u32::from_str_radix("10", 1));
    assert!(observed.is_ok(), "u32::from_str_radix panics for a radix outside 2 through 36 instead of returning ParseIntError");
}
