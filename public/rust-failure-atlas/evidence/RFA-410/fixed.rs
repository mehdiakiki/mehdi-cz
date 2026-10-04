fn main() {
    let bytes = [10_u8, 20, 30, 40];
    let whole: &[u8] = &bytes;
    let prefix: &[u8] = &bytes[..2];
    assert!(std::ptr::addr_eq(whole, prefix));
    assert!(!std::ptr::eq(whole, prefix));
    assert_ne!(whole.len(), prefix.len());
}
