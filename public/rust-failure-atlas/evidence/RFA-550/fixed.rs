trait Convert<T = Self> {
    fn convert(&self) -> T;
}

struct TextLength(String);

impl Convert<usize> for TextLength {
    fn convert(&self) -> usize {
        self.0.len()
    }
}

fn use_converter(converter: &dyn Convert<usize>) -> usize {
    converter.convert()
}

fn main() {
    let value = TextLength(String::from("rust"));
    assert_eq!(use_converter(&value), 4);
}
