trait Source {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

struct Names(std::vec::IntoIter<String>);

impl Source for Names {
    type Item = String;

    fn next(&mut self) -> Option<Self::Item> {
        self.0.next()
    }
}

fn consume(source: &mut dyn Source<Item = String>) {
    assert_eq!(source.next().as_deref(), Some("atlas"));
}

fn main() {
    let mut names = Names(vec![String::from("atlas")].into_iter());
    consume(&mut names);
}
