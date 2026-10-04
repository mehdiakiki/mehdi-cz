trait Window {
    fn contains(&self, value: u32) -> bool;
}

struct Positive;

impl Window for Positive {
    fn contains(&self, value: u32) -> bool {
        value > 0
    }
}

fn main() {
    assert!(Positive.contains(7));
}
