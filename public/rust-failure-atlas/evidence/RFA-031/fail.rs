#[repr(packed)]
struct Header {
    tag: u8,
    length: u32,
}

fn main() {
    let header = Header { tag: 1, length: 64 };

    // Copying either field by value is valid, even when the u32 is unaligned.
    let tag = header.tag;
    let length = header.length;
    assert_eq!((tag, length), (1, 64));

    // An ordinary reference promises u32 alignment. A packed field cannot make it.
    let borrowed: &u32 = &header.length;
    println!("{borrowed}");
}
