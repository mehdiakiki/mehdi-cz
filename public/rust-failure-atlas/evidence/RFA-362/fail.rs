use std::collections::BTreeMap;

fn main() {
    let mut map = BTreeMap::new();
    map.insert(3, "third");
    map.insert(1, "first");
    map.insert(2, "second");

    let mut visited = Vec::new();
    map.retain(|key, _value| {
        visited.push(*key);
        true
    });

    assert_eq!(
        visited,
        vec![3, 1, 2],
        "BTreeMap::retain visits entries in ascending key order, not insertion order"
    );
}
