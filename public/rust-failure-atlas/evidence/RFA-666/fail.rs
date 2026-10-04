use std::collections::HashMap;

fn main() {
    let mut states = HashMap::from([("job-7", "ready")]);
    let selected = states.entry("job-7").or_insert("fallback");
    assert_eq!(*selected, "fallback",
        "Entry::or_insert returns the existing value and does not replace it");
}
