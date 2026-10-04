struct View<'stored> {
    text: &'stored str,
}

impl<'stored> View<'stored> {
    fn compare<'input>(&self, other: &'input str) -> bool {
        self.text == other
    }
}

fn main() {
    let text = String::from("ready");
    let view = View { text: &text };
    assert!(view.compare("ready"));
}
