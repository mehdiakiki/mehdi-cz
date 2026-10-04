trait Inspect {
    fn inspect(&self, values: &impl Iterator<Item = u8>);
}

impl Inspect for () {
    fn inspect<I: Iterator<Item = u8>>(&self, _values: &I) {}
}

fn main() {}
