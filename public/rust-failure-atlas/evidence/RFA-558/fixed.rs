#[repr(C)]
struct Header {
    code: u16,
}

fn main() {
    assert_eq!(std::mem::size_of::<Header>(), 2);
}
