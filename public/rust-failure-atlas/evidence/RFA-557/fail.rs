struct View<'a> {
    text: &'a str,
}

impl<'a> View<'a> {
    fn compare<'a>(&self, other: &'a str) -> bool {
        self.text == other
    }
}

fn main() {}
