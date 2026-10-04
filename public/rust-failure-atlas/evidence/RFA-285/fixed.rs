use std::collections::HashSet;
use std::hash::{Hash, Hasher};

#[derive(Debug)]
struct Entry { id: u32, label: &'static str }

impl PartialEq for Entry {
    fn eq(&self, other: &Self) -> bool { self.id == other.id }
}
impl Eq for Entry {}
impl Hash for Entry {
    fn hash<H: Hasher>(&self, state: &mut H) { self.id.hash(state); }
}

fn main() {
    let mut entries = HashSet::from([Entry { id: 7, label: "stored" }]);
    let query = Entry { id: 7, label: "query" };
    let removed = entries.take(&query).expect("equal entry exists");

    assert_eq!((removed.id, removed.label), (7, "stored"));
    assert!(entries.is_empty());
}
