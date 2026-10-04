union Word {
    integer: u32,
    bytes: [u8; 4],
}

fn main() {
    let word = Word { integer: 0x0102_0304 };
    let _bytes = word.bytes;
}
