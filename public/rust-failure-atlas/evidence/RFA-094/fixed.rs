#[repr(packed)]
struct Header {
    tag: u8,
    length: u32,
}

fn main() {
    let header = Header { tag: 1, length: 42 };
    let length = header.length;
    assert_eq!(header.tag, 1);
    assert_eq!(length, 42);
}
