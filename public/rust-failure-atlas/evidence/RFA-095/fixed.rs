union Word {
    integer: u32,
    bytes: [u8; 4],
}

fn main() {
    let word = Word { integer: 0x0102_0304 };
    // Safety: every bit pattern is valid for [u8; 4].
    let bytes = unsafe { word.bytes };
    assert_eq!(bytes.len(), 4);
}
