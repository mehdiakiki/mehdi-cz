#[repr(align(8))]
struct Aligned(u8);

#[repr(packed)]
struct Packet {
    tag: u8,
    value: Aligned,
}

fn main() {}
