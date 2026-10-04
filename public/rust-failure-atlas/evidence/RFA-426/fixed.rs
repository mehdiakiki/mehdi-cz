trait Label {
    fn label(&self) -> &'static str;
}

struct Name;
impl Label for Name {
    fn label(&self) -> &'static str { "name" }
}

fn make() -> impl Label {
    Name
}

fn main() {
    assert_eq!(make().label(), "name");
}
