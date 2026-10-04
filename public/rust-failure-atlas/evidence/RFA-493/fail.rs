trait Reset {
    fn reset(&mut self);
}

struct Counter(u32);

impl Reset for Counter {
    fn reset() {}
}

fn main() {}
