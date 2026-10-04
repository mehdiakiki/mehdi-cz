#[repr(transparent)]
struct UserId(u64);

fn main() {
    assert_eq!(std::mem::size_of::<UserId>(), std::mem::size_of::<u64>());
}
