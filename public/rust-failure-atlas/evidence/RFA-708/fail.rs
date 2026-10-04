#[repr(C)]
struct Marker;

#[repr(transparent)]
struct Handle(u32, Marker);

fn main() {}
