trait Source {
    type Item;
}

fn take<I>(_: &<I as Source>::Item)
where
    I: Source<Item = u8>,
{}

fn main() {}
