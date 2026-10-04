fn main() {
    assert_eq!(8_u32.checked_ilog(1), None);
    assert_eq!(8_u32.checked_ilog(2), Some(3));
    assert_eq!(0_u32.checked_ilog(2), None);
}
