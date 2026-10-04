struct Counter(u64);

unsafe impl Counter {
    fn value(&self) -> u64 {
        self.0
    }
}

fn main() {}
