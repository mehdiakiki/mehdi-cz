fn main() {
    let decoded: Vec<_> = char::decode_utf16([0x0041_u16, 0xd800, 0x0042]).collect();
    assert_eq!(
        decoded.len(),
        2,
        "decode_utf16 emits an error for an unpaired surrogate and then continues with later code units"
    );
}
