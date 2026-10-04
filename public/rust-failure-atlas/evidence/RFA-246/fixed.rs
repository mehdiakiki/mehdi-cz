fn main() {
    let mut values = vec![1_u8];
    values.resize(3, 0);
    assert_eq!(values, [1, 0, 0]);

    values.truncate(2);
    assert_eq!(values, [1, 0]);
}
