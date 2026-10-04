trait Label {
    fn label(&self) -> &'static str;
}

fn read(value: &Label) -> &'static str {
    value.label()
}

fn main() {}
