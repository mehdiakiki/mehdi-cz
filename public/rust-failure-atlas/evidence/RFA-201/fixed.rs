use std::collections::BTreeMap;

fn main() {
    let mut lower = BTreeMap::from([(1, "one"), (2, "two"), (3, "three")]);
    let upper = lower.split_off(&2);

    assert_eq!(lower.keys().copied().collect::<Vec<_>>(), [1]);
    assert_eq!(upper.keys().copied().collect::<Vec<_>>(), [2, 3]);
}
