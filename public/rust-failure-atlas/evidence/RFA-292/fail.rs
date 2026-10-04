fn main() {
    let mut range = 3..=5;
    assert_eq!(range.by_ref().collect::<Vec<_>>(), vec![3, 4, 5]);

    assert!(
        range.start() > range.end(),
        "RangeInclusive endpoints are unspecified after exhaustion and cannot be compared to detect emptiness"
    );
}
