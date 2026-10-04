fn main() {
    assert_eq!(
        300.0_f64 as u8,
        44,
        "a float-to-integer as cast saturates out-of-range values instead of wrapping like a narrowing integer cast"
    );
}
