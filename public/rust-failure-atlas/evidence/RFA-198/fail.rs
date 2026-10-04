use std::collections::BTreeMap;

fn main() {
    let mut current = BTreeMap::from([("mode", "safe"), ("workers", "4")]);
    let mut incoming = BTreeMap::from([("mode", "fast"), ("timeout", "30")]);

    current.append(&mut incoming);

    assert!(incoming.is_empty());
    assert_eq!(
        current["mode"], "safe",
        "BTreeMap::append overwrites conflicting values with values from the other map"
    );
}
