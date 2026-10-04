use std::collections::BTreeMap;

fn main() {
    let mut current = BTreeMap::from([("mode", "safe"), ("workers", "4")]);
    let incoming = BTreeMap::from([("mode", "fast"), ("timeout", "30")]);

    for (key, value) in incoming {
        current.entry(key).or_insert(value);
    }

    assert_eq!(current["mode"], "safe");
    assert_eq!(current["timeout"], "30");
}
