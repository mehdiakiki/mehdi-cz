#[repr(C)]
struct Pair {
    left: u32,
    right: u32,
}

unsafe extern "C" {
    fn accept_pair(pair: Pair);
}

fn main() {}
