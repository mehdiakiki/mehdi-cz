trait Source {
    type Item;
}

fn take<I>(_: &<I as Source<Item = u8>>::Item) {}

fn main() {}
