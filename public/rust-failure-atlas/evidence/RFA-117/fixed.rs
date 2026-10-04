#[repr(C, align(8))]
struct Header {
    tag: u8,
    value: u32,
}

fn main() {
    assert_eq!(std::mem::align_of::<Header>(), 8);
}
