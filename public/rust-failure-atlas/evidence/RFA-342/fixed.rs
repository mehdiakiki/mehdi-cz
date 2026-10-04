fn main() {
    assert_eq!(42_i32.wrapping_shl(32), 42);
    assert_eq!(42_i32.wrapping_shl(33), 84);
    assert_eq!(42_i32.checked_shl(32), None);
    assert_eq!(42_i32.checked_shl(31), Some(0));
}
