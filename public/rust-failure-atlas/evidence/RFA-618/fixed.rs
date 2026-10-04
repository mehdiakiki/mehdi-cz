#[repr(transparent)]
enum Status {
    Ready(u32),
}

fn main() {
    assert_eq!(std::mem::size_of::<Status>(), std::mem::size_of::<u32>());
}
