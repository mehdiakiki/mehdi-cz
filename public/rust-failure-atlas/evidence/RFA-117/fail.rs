#[repr(C, packed, align(8))]
struct Header {
    tag: u8,
    value: u32,
}

fn main() {
    let _ = std::mem::size_of::<Header>();
}
