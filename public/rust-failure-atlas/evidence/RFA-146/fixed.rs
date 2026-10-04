fn main() {
    let mut values = vec![0, 1, 2, 3];

    drop(values.drain(1..3));

    assert_eq!(values, vec![0, 3]);
}
