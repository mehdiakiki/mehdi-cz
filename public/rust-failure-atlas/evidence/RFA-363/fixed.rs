fn main() {
    assert_eq!(42_i32.unbounded_shl(31), 0);
    assert_eq!(42_i32.unbounded_shl(32), 0);
    assert_eq!(42_i32.unbounded_shl(33), 0);

    assert_eq!(42_i32.wrapping_shl(32), 42);
    assert_eq!(42_i32.checked_shl(32), None);
}
