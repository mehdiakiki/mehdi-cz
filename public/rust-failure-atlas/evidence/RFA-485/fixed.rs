trait Source {
    type Item;
    type Error;
    fn error(&self) -> &Self::Error;
}

fn main() {}
