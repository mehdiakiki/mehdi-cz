fn main() {
    assert_eq!(0_u32.leading_zeros(), u32::BITS);
    assert_eq!(u32::BITS - 0_u32.leading_zeros(), 0);
    assert_eq!(1_u32.leading_zeros(), u32::BITS - 1);
    assert_eq!(u32::BITS - 1_u32.leading_zeros(), 1);
}
