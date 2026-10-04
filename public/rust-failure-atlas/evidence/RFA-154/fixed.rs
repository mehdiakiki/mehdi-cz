use std::collections::HashMap;
use std::hash::{Hash, Hasher};

#[derive(Debug)]
struct ServiceKey {
    id: u32,
    label: &'static str,
}

impl PartialEq for ServiceKey {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for ServiceKey {}

impl Hash for ServiceKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

fn main() {
    let mut services = HashMap::new();
    services.insert(ServiceKey { id: 7, label: "old" }, "v1");

    let replacement = ServiceKey { id: 7, label: "new" };
    services.remove(&replacement);
    services.insert(replacement, "v2");

    let lookup = ServiceKey { id: 7, label: "lookup" };
    let (stored_key, value) = services.get_key_value(&lookup).unwrap();
    assert_eq!(stored_key.label, "new");
    assert_eq!(value, &"v2");
}
