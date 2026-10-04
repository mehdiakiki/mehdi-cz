fn main() {
    assert_eq!(i32::MIN.overflowing_rem(-1), (0, true));
    assert_eq!(5_i32.overflowing_rem(2), (1, false));
    assert_eq!(i32::MIN.checked_rem(-1), None);
}
