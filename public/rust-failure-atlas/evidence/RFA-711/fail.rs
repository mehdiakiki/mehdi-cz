use std::cmp::Ordering;

#[derive(PartialEq, Eq)]
struct Inconsistent(i32);

impl Ord for Inconsistent {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}

impl PartialOrd for Inconsistent {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(other.0.cmp(&self.0))
    }
}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
struct Wrapper(Inconsistent);

fn main() {
    let one = Wrapper(Inconsistent(1));
    let two = Wrapper(Inconsistent(2));
    assert_eq!(one.partial_cmp(&two), Some(Ordering::Greater));
}
