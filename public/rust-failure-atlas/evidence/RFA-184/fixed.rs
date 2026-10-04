use std::collections::BTreeMap;

fn count_range(values: &BTreeMap<i32, &'static str>, start: i32, end: i32) -> Option<usize> {
    (start <= end).then(|| values.range(start..end).count())
}

fn main() {
    let values = BTreeMap::from([(1, "one"), (2, "two"), (3, "three")]);
    assert_eq!(count_range(&values, 3, 2), None);
    assert_eq!(count_range(&values, 1, 3), Some(2));
}
