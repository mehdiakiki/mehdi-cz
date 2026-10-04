fn main() {
    let mut values = vec![1, 2, 4, 6];
    let extracted = values
        .extract_if(.., |value| *value % 2 == 0)
        .collect::<Vec<_>>();

    assert_eq!(extracted, vec![2, 4, 6]);
    assert_eq!(values, vec![1]);
}
