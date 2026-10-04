fn main() {
    let mut values = vec![10, 20, 30, 40];
    let suffix = values.split_off(2);

    assert_eq!(values, [10, 20]);
    assert_eq!(suffix, [30, 40]);
}
