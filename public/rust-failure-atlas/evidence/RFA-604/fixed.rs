#[repr(transparent)]
struct RequestId(u64);

fn main() {
    assert_eq!(std::mem::size_of::<RequestId>(), std::mem::size_of::<u64>());
}
