trait Label {
    fn label(&self) -> &'static str;
}

struct Name;
impl Label for Name {
    fn label(&self) -> &'static str { "name" }
}

fn make() -> dyn Label {
    Name
}

fn main() {}
