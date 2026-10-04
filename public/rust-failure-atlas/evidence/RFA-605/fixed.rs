#[repr(align(16))]
struct Aligned([u8; 16]);

fn main() {
    assert_eq!(std::mem::align_of::<Aligned>(), 16);
}
