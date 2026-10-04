use std::{
    collections::HashSet,
    hash::{Hash, Hasher},
};

#[derive(Debug)]
struct Record {
    id: u8,
    source: &'static str,
}

impl PartialEq for Record {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for Record {}

impl Hash for Record {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

fn main() {
    let left = HashSet::from([
        Record { id: 1, source: "left" },
        Record { id: 2, source: "left" },
    ]);
    let right = HashSet::from([Record { id: 1, source: "right" }]);

    let common_ids: Vec<_> = left
        .iter()
        .filter(|record| right.contains(*record))
        .map(|record| (record.id, record.source))
        .collect();

    assert_eq!(common_ids, [(1, "left")]);
}
