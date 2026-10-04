trait Inspect {
    fn inspect<I: Iterator<Item = u8>>(&self, values: &I);
}

impl Inspect for () {
    fn inspect<I: Iterator<Item = u8>>(&self, _values: &I) {}
}

fn main() {
    ().inspect(&(0_u8..3));
}
