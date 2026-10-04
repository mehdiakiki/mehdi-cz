fn main() {
    let mut scanned = (1..=3)
        .scan((), |_, value| (value != 2).then_some(value))
        .fuse();

    assert_eq!(scanned.next(), Some(1));
    assert_eq!(scanned.next(), None);
    assert_eq!(scanned.next(), None);
}
