trait Numbers {
    fn values(&self) -> Box<dyn Iterator<Item = u8> + '_>;
}

struct Three;

impl Numbers for Three {
    fn values(&self) -> Box<dyn Iterator<Item = u8> + '_> { Box::new(0..3) }
}

fn main() {
    let numbers: &dyn Numbers = &Three;
    assert_eq!(numbers.values().sum::<u8>(), 3);
}
