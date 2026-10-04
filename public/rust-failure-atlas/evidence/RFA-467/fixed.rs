struct Counter(u32);

impl Counter {
    fn current(&self) -> u32 {
        self.0
    }
}

fn main() {
    assert_eq!(Counter(7).current(), 7);
}
