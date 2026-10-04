fn ascending() -> impl Iterator<Item = u8> {
    0..3
}

fn descending() -> impl Iterator<Item = u8> {
    (0..3).rev()
}

fn selected(reverse: bool) -> Box<dyn Iterator<Item = u8>> {
    if reverse {
        Box::new(descending())
    } else {
        Box::new(ascending())
    }
}

fn main() {
    assert_eq!(vec![0, 1, 2], selected(false).collect::<Vec<_>>());
}
