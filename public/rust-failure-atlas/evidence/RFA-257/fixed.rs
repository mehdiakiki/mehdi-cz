fn main() {
    assert_eq!(0_u32.checked_ilog2(), None);
    assert_eq!(1_u32.checked_ilog2(), Some(0));
    assert_eq!(8_u32.checked_ilog2(), Some(3));
    assert_eq!(15_u32.checked_ilog2(), Some(3));
}
