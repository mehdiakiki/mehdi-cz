trait Window {
    fn contains(&self, value: u32) -> bool;
}

struct Positive;

impl Window for Positive {
    fn contains(&self) -> bool {
        true
    }
}

fn main() {}
