fn main() {
    let truncated_little_endian_code_unit = [0x41_u8];
    let decoded = String::from_utf16le(&truncated_little_endian_code_unit).unwrap();
    println!("{decoded}");
}
