fn convert(value: u32) -> [u8; 4] {
    value.to_ne_bytes()
}

fn main() {
    let bytes = convert(0x0102_0304);
    assert_eq!(u32::from_ne_bytes(bytes), 0x0102_0304);
}
