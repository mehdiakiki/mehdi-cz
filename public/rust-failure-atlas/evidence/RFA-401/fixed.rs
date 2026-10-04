#[repr(align(8))]
struct Aligned(u8);

#[repr(C)]
struct Packet {
    tag: u8,
    value: Aligned,
}

fn main() {
    assert_eq!(std::mem::align_of::<Packet>(), 8);
}
