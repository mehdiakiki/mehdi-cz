fn main() {
    let mut values = [1, 2, 3, 4].into_iter().peekable();
    let mut prefix = Vec::new();

    while values.peek().is_some_and(|value| *value < 3) {
        prefix.push(values.next().unwrap());
    }

    assert_eq!(prefix, vec![1, 2]);
    assert_eq!(values.next(), Some(3));
}
