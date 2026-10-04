fn main() {
    let mut values = [
        20, 3, 17, 1, 15, 8, 12, 6, 19, 4, 14, 2, 18, 7, 11, 5, 16, 9, 13, 10,
    ];
    let (lower, selected, upper) = values.select_nth_unstable(9);

    assert_eq!(*selected, 10);
    assert!(lower.iter().all(|value| *value <= 10));
    assert!(upper.iter().all(|value| *value >= 10));

    values.sort_unstable();
    assert_eq!(
        values,
        [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
        ]
    );
}
