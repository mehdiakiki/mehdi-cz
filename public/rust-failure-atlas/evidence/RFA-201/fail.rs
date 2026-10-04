use std::collections::BTreeMap;

fn main() {
    let mut lower = BTreeMap::from([(1, "one"), (2, "two"), (3, "three")]);
    let upper = lower.split_off(&2);

    assert!(
        lower.contains_key(&2),
        "BTreeMap::split_off moves the boundary key into the returned map"
    );
    assert!(upper.contains_key(&3));
}
