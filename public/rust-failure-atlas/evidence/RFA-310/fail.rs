fn main() {
    let mut scanned = (1..=3).scan((), |_, value| (value != 2).then_some(value));

    assert_eq!(scanned.next(), Some(1));
    assert_eq!(scanned.next(), None);
    assert_eq!(
        scanned.next(),
        None,
        "Iterator::scan is not fused and can yield Some again after its closure returns None"
    );
}
