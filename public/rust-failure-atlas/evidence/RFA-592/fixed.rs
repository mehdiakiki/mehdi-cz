#[repr(C, packed(2))]
struct Header(u32);

fn main() {
    assert_eq!(std::mem::align_of::<Header>(), 2);
}
