trait Convert {
    fn convert<T: ToString>(&self, value: T) -> String;
}

struct TextConverter;

impl Convert for TextConverter {
    fn convert(&self, value: u32) -> String {
        value.to_string()
    }
}

fn main() {}
