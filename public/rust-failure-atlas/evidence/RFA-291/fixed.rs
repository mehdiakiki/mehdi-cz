fn main() {
    let first = [1];
    let values: Vec<_> = first.into_iter().chain([2]).collect();

    assert_eq!(values, vec![1, 2]);
}
