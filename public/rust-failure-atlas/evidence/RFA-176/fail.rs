fn main() {
    let values = [0, 1, 1, 1, 2];
    let index = values.binary_search(&1).unwrap();

    assert_eq!(
        index, 1,
        "binary_search may return any matching duplicate, not the first one"
    );
}
