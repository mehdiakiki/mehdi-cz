trait Refresh {
    fn refresh(&self) -> u64;
}

struct Cache {
    generation: u64,
}

impl Refresh for Cache {
    fn refresh(&self) -> u64 {
        self.generation + 1
    }
}

fn main() {
    let cache = Cache { generation: 6 };
    assert_eq!(cache.refresh(), 7);
}
