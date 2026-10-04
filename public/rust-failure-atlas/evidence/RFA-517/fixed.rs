trait Consume {
    fn consume(&self) -> usize;
}

impl Consume for String {
    fn consume(&self) -> usize {
        self.len()
    }
}

fn main() {
    let value: Box<dyn Consume> = Box::new(String::from("rust"));
    assert_eq!(value.consume(), 4);
}
