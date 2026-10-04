fn main() {
    assert_eq!(
        42_i32.wrapping_shl(32),
        0,
        "wrapping_shl masks the shift count; it is not an infinite-precision shift followed by truncation"
    );
}
