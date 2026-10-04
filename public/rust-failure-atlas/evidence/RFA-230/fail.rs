fn main() {
    let mut values = [10, 20, 30, 40].into_iter();
    assert_eq!(values.nth(2), Some(30));
    assert_eq!(
        values.next(),
        Some(20),
        "Iterator::nth consumes skipped items and the returned item"
    );
}
