fn levels(depth: u8) -> Box<dyn Iterator<Item = u8>> {
    if depth == 0 {
        Box::new(std::iter::once(0))
    } else {
        Box::new(std::iter::once(depth).chain(levels(depth - 1)))
    }
}

fn main() {
    assert_eq!(levels(3).collect::<Vec<_>>(), [3, 2, 1, 0]);
}
