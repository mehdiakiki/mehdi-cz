fn main() {
    let mut values = [10, 20, 30, 40].into_iter();
    let consumed = 1;
    assert_eq!(values.next(), Some(10));

    let source_position = values.position(|value| value == 30).map(|index| consumed + index);
    assert_eq!(source_position, Some(2));

    let direct = [10, 20, 30, 40]
        .into_iter()
        .position(|value| value == 30);
    assert_eq!(direct, Some(2));
}
