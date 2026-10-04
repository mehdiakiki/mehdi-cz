use std::collections::HashMap;
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

struct Candidate {
    drops: Arc<AtomicUsize>,
}

impl Candidate {
    fn tracked(drops: &Arc<AtomicUsize>) -> Self {
        Self {
            drops: Arc::clone(drops),
        }
    }
}

impl Drop for Candidate {
    fn drop(&mut self) {
        self.drops.fetch_add(1, Ordering::SeqCst);
    }
}

fn main() {
    let drops = Arc::new(AtomicUsize::new(0));
    let mut values = HashMap::new();
    values.insert("ready", Candidate::tracked(&drops));

    values.entry("ready").or_insert(Candidate::tracked(&drops));

    assert_eq!(
        drops.load(Ordering::SeqCst),
        0,
        "Entry::or_insert eagerly constructs and drops an unused default"
    );
}
