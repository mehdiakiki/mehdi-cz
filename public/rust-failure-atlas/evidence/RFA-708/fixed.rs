struct Marker;

#[repr(transparent)]
struct Handle(u32, Marker);

fn main() {
    assert_eq!(std::mem::size_of::<Handle>(), std::mem::size_of::<u32>());
}
