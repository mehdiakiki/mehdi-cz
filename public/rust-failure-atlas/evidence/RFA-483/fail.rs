trait Window {}

struct Buffer;

impl Window for Buffer {
    const CAPACITY: usize = 64;
}

fn main() {}
