trait Version {
    fn version() -> u32;
}

struct Protocol;
impl Version for Protocol {
    fn version() -> u32 { 3 }
}

fn main() {
    assert_eq!(Protocol::version(), 3);
}
