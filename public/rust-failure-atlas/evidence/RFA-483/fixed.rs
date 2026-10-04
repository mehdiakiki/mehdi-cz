trait Window {
    const CAPACITY: usize;
}

struct Buffer;

impl Window for Buffer {
    const CAPACITY: usize = 64;
}

fn main() { assert_eq!(Buffer::CAPACITY, 64); }
