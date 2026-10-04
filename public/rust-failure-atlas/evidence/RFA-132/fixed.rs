use std::collections::HashMap;

fn main() {
    let mut jobs = HashMap::new();
    jobs.insert(7_u32, "queued");

    let value = jobs.remove(&7).unwrap();
    jobs.insert(8, value);

    assert_eq!(Some(&"queued"), jobs.get(&8));
}
