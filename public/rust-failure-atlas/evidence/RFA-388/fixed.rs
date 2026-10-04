fn main() {
    assert_eq!((-13_i32).overflowing_shr(32), (-13, true));
    assert_eq!((-13_i32).wrapping_shr(32), -13);
    assert_eq!((-13_i32).checked_shr(32), None);
    assert_eq!((-13_i32).unbounded_shr(32), -1);
}
