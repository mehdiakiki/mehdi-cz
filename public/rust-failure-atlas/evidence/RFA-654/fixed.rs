use std::collections::BTreeMap;

fn main() {
    let mut values = BTreeMap::new();
    values.insert(2, "second");
    values.insert(1, "first");
    let keys: Vec<_> = values.keys().copied().collect();
    assert_eq!(keys, vec![1, 2]);
}
