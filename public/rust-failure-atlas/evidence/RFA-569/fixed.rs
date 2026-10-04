#[repr(align(32))]
struct CacheLine([u8; 24]);

fn main() {
    assert_eq!(std::mem::align_of::<CacheLine>(), 32);
    assert_eq!(std::mem::size_of::<CacheLine>(), 32);
}
