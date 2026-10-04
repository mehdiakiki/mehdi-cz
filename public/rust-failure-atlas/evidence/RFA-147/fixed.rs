fn main() {
    let mut values = [1, 2, 3, 4]
        .into_iter()
        .map_while(|value| (value != 2).then_some(value))
        .fuse();

    assert_eq!(values.next(), Some(1));
    assert_eq!(values.next(), None);
    assert_eq!(values.next(), None);
}
