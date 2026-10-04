fn main() {
    let mut values = [10, 20, 30, 40].into_iter();
    assert_eq!(values.next(), Some(10));

    let position = values.position(|value| value == 30);
    assert_eq!(
        position,
        Some(2),
        "Iterator::position counts from the iterator's current position"
    );
}
