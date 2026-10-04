use std::collections::HashMap;

fn main() {
    let mut states = HashMap::from([("job-7", "ready")]);
    states.insert("job-7", "fallback");
    assert_eq!(states["job-7"], "fallback");
}
