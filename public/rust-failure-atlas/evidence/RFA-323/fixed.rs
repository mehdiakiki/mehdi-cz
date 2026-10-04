fn main() {
    assert_eq!(7_u32.checked_next_multiple_of(0), None);
    assert_eq!(7_u32.checked_next_multiple_of(4), Some(8));
    assert_eq!(u32::MAX.checked_next_multiple_of(2), None);
}
