trait Store {
    fn len(&self) -> usize;
}

fn inspect(store: &dyn Store) -> usize {
    store.len()
}

struct MemoryStore(usize);

impl Store for MemoryStore {
    fn len(&self) -> usize { self.0 }
}

fn main() {
    assert_eq!(inspect(&MemoryStore(3)), 3);
}
