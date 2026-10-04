use std::collections::HashSet;
use std::hash::{Hash, Hasher};

#[derive(Debug)]
struct Service {
    id: u32,
    label: &'static str,
}

impl PartialEq for Service {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for Service {}

impl Hash for Service {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

fn main() {
    let mut services = HashSet::new();
    services.insert(Service { id: 7, label: "old" });
    services.insert(Service { id: 7, label: "new" });

    let lookup = Service { id: 7, label: "lookup" };
    assert_eq!(services.get(&lookup).unwrap().label, "old");
}
