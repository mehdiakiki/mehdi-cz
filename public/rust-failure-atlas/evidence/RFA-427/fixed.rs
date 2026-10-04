trait Label {
    fn label(&self) -> &'static str;
}

struct Name;
impl Label for Name {
    fn label(&self) -> &'static str { "name" }
}

fn read(value: &dyn Label) -> &'static str {
    value.label()
}

fn main() {
    assert_eq!(read(&Name), "name");
}
