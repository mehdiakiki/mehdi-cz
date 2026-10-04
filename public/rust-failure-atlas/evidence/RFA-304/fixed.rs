fn main() {
    assert_eq!((-1_i32).checked_isqrt(), None);
    assert_eq!(0_i32.checked_isqrt(), Some(0));
    assert_eq!(15_i32.checked_isqrt(), Some(3));
    assert_eq!(16_i32.checked_isqrt(), Some(4));
}
