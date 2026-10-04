trait Store {
    fn len(&self) -> usize;
}

fn inspect(store: &Store) -> usize {
    store.len()
}

fn main() {}
