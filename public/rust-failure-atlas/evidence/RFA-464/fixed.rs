fn merge(left: u8, right: u8) -> u8 {
    left.saturating_add(right)
}

fn main() {
    assert_eq!(merge(1, 2), 3);
}
