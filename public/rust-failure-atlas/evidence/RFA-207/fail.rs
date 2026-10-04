use std::collections::HashMap;

fn main() {
    let mut cache = HashMap::with_capacity(64);
    cache.insert("alpha", 1);
    cache.insert("beta", 2);

    let removed = cache.drain().count();
    assert_eq!(removed, 2);
    assert_eq!(
        cache.capacity(),
        0,
        "HashMap::drain keeps the allocation for reuse"
    );
}
