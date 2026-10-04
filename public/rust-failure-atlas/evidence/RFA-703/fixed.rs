fn main() {
    let frame = [0xAA_u8, 0x10, 0x20, 0xCC];
    let body = frame
        .strip_circumfix(&[0xAA], &[0xCC])
        .expect("non-overlapping frame markers");
    assert_eq!(body, &[0x10, 0x20]);
}
