fn main() {
    let mut values = [
        20, 3, 17, 1, 15, 8, 12, 6, 19, 4, 14, 2, 18, 7, 11, 5, 16, 9, 13, 10,
    ];
    let (_, selected, _) = values.select_nth_unstable(9);
    assert_eq!(*selected, 10);

    assert!(
        values.is_sorted(),
        "select_nth_unstable partitions the slice but does not sort both sides"
    );
}
