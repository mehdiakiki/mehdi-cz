fn main() {
    assert!(0_u32.is_multiple_of(0));
    assert!(!6_u32.is_multiple_of(0));
    assert!(6_u32.is_multiple_of(3));
}
