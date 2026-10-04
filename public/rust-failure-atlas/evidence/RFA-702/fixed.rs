fn main() {
    let little_endian_code_units = [0x41_u8, 0x00, 0x42, 0x00];
    let decoded = String::from_utf16le(&little_endian_code_units).expect("valid UTF-16LE");
    assert_eq!(decoded, "AB");
}
