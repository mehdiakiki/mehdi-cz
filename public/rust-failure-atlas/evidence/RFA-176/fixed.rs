fn main() {
    let values = [0, 1, 1, 1, 2];
    let first = values.partition_point(|value| value < &1);

    assert_eq!(first, 1);
    assert_eq!(values.get(first), Some(&1));
}
