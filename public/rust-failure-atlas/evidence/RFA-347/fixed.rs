fn main() {
    let decoded: Vec<_> = char::decode_utf16([0x0041_u16, 0xd800, 0x0042]).collect();
    assert_eq!(decoded[0], Ok('A'));
    assert_eq!(decoded[1].as_ref().unwrap_err().unpaired_surrogate(), 0xd800);
    assert_eq!(decoded[2], Ok('B'));

    let lossy: String = decoded
        .into_iter()
        .map(|result| result.unwrap_or(char::REPLACEMENT_CHARACTER))
        .collect();
    assert_eq!(lossy, "A\u{fffd}B");
}
