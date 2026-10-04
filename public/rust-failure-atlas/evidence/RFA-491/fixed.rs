trait Convert {
    fn convert<T: ToString>(&self, value: T) -> String;
}

struct TextConverter;

impl Convert for TextConverter {
    fn convert<T: ToString>(&self, value: T) -> String {
        value.to_string()
    }
}

fn main() {
    assert_eq!(TextConverter.convert(42), "42");
}
