struct View<'a> {
    text: &'a str,
}

impl<'a> View<'a> {
    fn text(&self) -> &'a str {
        self.text
    }
}

fn main() {
    assert_eq!(View { text: "ready" }.text(), "ready");
}
