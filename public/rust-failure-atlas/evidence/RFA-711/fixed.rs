use std::cmp::Ordering;

#[derive(PartialEq, Eq)]
struct Consistent(i32);

impl Ord for Consistent {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}

impl PartialOrd for Consistent {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
struct Wrapper(Consistent);

fn main() {
    let one = Wrapper(Consistent(1));
    let two = Wrapper(Consistent(2));
    assert_eq!(one.cmp(&two), Ordering::Less);
    assert_eq!(one.partial_cmp(&two), Some(Ordering::Less));
}
