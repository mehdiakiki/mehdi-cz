use std::collections::HashMap;

fn main() {
    let mut cache = HashMap::with_capacity(64);
    cache.insert("alpha", 1);
    cache.insert("beta", 2);

    let removed = std::mem::take(&mut cache).into_iter().collect::<Vec<_>>();
    assert_eq!(removed.len(), 2);
    assert_eq!(cache.capacity(), 0);
}
