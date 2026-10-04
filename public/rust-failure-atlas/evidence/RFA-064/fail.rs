trait Source {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

fn consume(_source: &mut dyn Source) {}

fn main() {}
