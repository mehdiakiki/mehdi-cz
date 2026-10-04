trait Factory {
    fn create() -> u8;
}

struct One;

impl Factory for One {
    fn create() -> u8 { 1 }
}

fn main() {
    assert_eq!(<One as Factory>::create(), 1);
}
