fn main() {
    let observed = std::panic::catch_unwind(|| char::from_digit(1, 37));
    assert!(observed.is_ok(), "char::from_digit panics when radix is greater than 36 instead of returning None");
}
