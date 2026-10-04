fn main() {
    let bytes = [7_u8, 8, 9];
    let thin = bytes.as_ptr();
    let slice = std::ptr::slice_from_raw_parts(thin, bytes.len());
    assert_eq!(slice.len(), 3);
}
