#[repr(C)]
struct WireHeader {
    kind: u8,
    sequence: u32,
}

const _: () = assert!(std::mem::size_of::<WireHeader>() == 8);

fn main() {
    assert_eq!(std::mem::align_of::<WireHeader>(), 4);
}
