fn main() {
    let bytes = [10_u8, 20, 30, 40];
    let whole: &[u8] = &bytes;
    let prefix: &[u8] = &bytes[..2];
    assert_eq!(whole.as_ptr(), prefix.as_ptr());
    assert!(std::ptr::eq(whole, prefix), "ptr::eq compares wide-pointer metadata as well as the data address");
}
