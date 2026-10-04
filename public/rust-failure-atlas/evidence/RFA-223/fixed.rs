fn main() {
    assert_eq!(u8::MAX.checked_shl(1), Some(254));
    assert_eq!(u8::MAX.checked_shl(u8::BITS), None);

    let widened = u16::from(u8::MAX) << 1;
    assert!(u8::try_from(widened).is_err());
}
