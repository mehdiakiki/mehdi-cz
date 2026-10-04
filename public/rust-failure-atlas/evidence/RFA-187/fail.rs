fn main() {
    let mut values = vec![1, 2, 4, 6];
    {
        let mut extracted = values.extract_if(.., |value| *value % 2 == 0);
        assert_eq!(extracted.next(), Some(2));
    }

    assert_eq!(
        values,
        vec![1],
        "dropping an unexhausted Vec::extract_if retains unvisited matching elements"
    );
}
