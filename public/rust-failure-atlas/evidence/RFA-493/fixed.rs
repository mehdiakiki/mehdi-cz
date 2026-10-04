trait Reset {
    fn reset(&mut self);
}

struct Counter(u32);

impl Reset for Counter {
    fn reset(&mut self) {
        self.0 = 0;
    }
}

fn main() {
    let mut counter = Counter(9);
    counter.reset();
    assert_eq!(counter.0, 0);
}
