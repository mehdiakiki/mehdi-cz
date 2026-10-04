struct Counter(u64);

impl Counter {
    fn value(&self) -> u64 {
        self.0
    }
}

fn main() {
    assert_eq!(Counter(7).value(), 7);
}
