trait Numbers {
    fn values(&self) -> impl Iterator<Item = u8>;
}

struct Three;

impl Numbers for Three {
    fn values(&self) -> impl Iterator<Item = u8> { 0..3 }
}

fn main() {
    let numbers: &dyn Numbers = &Three;
    assert_eq!(numbers.values().sum::<u8>(), 3);
}
