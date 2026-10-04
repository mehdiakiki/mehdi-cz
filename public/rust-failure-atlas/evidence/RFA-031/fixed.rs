#[repr(packed)]
struct Header {
    tag: u8,
    length: u32,
}

fn main() {
    let header = Header { tag: 1, length: 64 };

    // Safe field access copies the value into aligned local storage.
    let copied = header.length;
    println!("{copied}");

    // At an FFI boundary, form a raw pointer directly and state the unaligned load.
    let pointer = std::ptr::addr_of!(header.length);
    let explicitly_read = unsafe { pointer.read_unaligned() };
    assert_eq!(explicitly_read, 64);
    assert_eq!(header.tag, 1);
}
