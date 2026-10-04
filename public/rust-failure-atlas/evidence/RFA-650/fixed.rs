fn main() {
    let mut values = vec![1, 2, 3, 4];
    drop(values.drain(1..3));
    assert_eq!(values, vec![1, 4]);
}
