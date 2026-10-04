struct View<'a> {
    text: &'a str,
}

impl View<'a> {
    fn text(&self) -> &'a str {
        self.text
    }
}

fn main() {}
