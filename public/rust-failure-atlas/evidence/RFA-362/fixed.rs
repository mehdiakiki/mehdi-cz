use std::collections::BTreeMap;

fn main() {
    let mut map = BTreeMap::from([(3, 30), (1, 10), (2, 20)]);
    let mut visited = Vec::new();

    map.retain(|key, value| {
        visited.push(*key);
        *value += 1;
        *key != 2
    });

    assert_eq!(visited, vec![1, 2, 3]);
    assert_eq!(map.into_iter().collect::<Vec<_>>(), vec![(1, 11), (3, 31)]);
}
