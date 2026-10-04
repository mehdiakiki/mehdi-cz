use std::collections::BTreeMap;

fn main() {
    let values = BTreeMap::from([(1, "one"), (2, "two"), (3, "three")]);
    let _empty = values.range(3..2).count();
}
