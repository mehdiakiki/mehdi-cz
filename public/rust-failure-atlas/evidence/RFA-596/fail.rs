trait Consume {
    fn consume(&self, values: &impl Iterator<Item = u8>);
}

impl Consume for () {
    fn consume<I: Iterator<Item = u8>>(&self, values: &I) {
        let _ = values;
    }
}

fn main() {}
