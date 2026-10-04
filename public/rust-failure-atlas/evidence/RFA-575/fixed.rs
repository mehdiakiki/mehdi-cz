use std::ops::Not;

#[derive(Debug, PartialEq)]
struct Enabled(bool);

impl Not for Enabled {
    type Output = Self;

    fn not(self) -> Self::Output {
        Self(!self.0)
    }
}

fn main() {
    assert_eq!(!Enabled(true), Enabled(false));
}
