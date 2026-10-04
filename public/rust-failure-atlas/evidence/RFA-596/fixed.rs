trait Consume {
    fn consume(&self, values: &impl Iterator<Item = u8>);
}

impl Consume for () {
    fn consume(&self, values: &impl Iterator<Item = u8>) {
        let _ = values;
    }
}

fn main() {}
