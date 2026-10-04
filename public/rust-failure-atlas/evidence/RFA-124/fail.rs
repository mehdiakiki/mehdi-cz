#[repr(C)]
struct WireHeader {
    kind: u8,
    sequence: u32,
}

const _: () = assert!(std::mem::size_of::<WireHeader>() == 5);

fn main() {}
