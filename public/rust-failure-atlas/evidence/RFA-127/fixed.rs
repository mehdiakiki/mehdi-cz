trait Label {
    fn label(&self) -> &str;
}

struct Borrowed<'a>(&'a str);

impl Label for Borrowed<'_> {
    fn label(&self) -> &str {
        self.0
    }
}

fn boxed<'a>(text: &'a str) -> Box<dyn Label + 'a> {
    Box::new(Borrowed(text))
}

fn main() {
    let text = String::from("temporary");
    assert_eq!("temporary", boxed(&text).label());
}
