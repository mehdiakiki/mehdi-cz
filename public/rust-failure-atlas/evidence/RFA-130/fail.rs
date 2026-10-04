fn ascending() -> impl Iterator<Item = u8> {
    0..3
}

fn descending() -> impl Iterator<Item = u8> {
    (0..3).rev()
}

fn selected(reverse: bool) -> impl Iterator<Item = u8> {
    if reverse {
        descending()
    } else {
        ascending()
    }
}

fn main() {
    println!("{:?}", selected(false).collect::<Vec<_>>());
}
