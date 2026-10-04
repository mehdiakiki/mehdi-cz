fn main() {
    let mut values = vec![1, 2, 3, 4];
    {
        let mut removed = values.splice(1..2, [7, 8, 9]);
        assert_eq!(removed.next(), Some(2));
    }

    assert_eq!(values, vec![1, 7, 8, 9, 3, 4]);
}
