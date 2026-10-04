fn main() {
    let mut values = [1, 2, 3, 4].into_iter();
    let prefix: Vec<_> = values.by_ref().take_while(|value| *value < 3).collect();

    assert_eq!(prefix, vec![1, 2]);
    assert_eq!(
        values.next(),
        Some(3),
        "take_while consumes the first item that fails its predicate"
    );
}
