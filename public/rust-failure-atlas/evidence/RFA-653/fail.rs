use std::collections::HashMap;

fn main() {
    let mut states = HashMap::new();
    states.insert("job", "queued");
    let previous = states.insert("job", "running");
    assert_eq!(previous, None, "HashMap::insert returns the replaced value when the key already exists");
}
