use std::sync::{Arc, atomic::{AtomicU8, Ordering}};

fn main() {
    let shared = Arc::new(AtomicU8::new(0));
    let mut slots = Vec::new();
    slots.resize(3, Arc::clone(&shared));
    slots[0].store(9, Ordering::Relaxed);
    assert_eq!(slots[1].load(Ordering::Relaxed), 0,
        "Vec::resize clones the value, but cloning Arc keeps one shared allocation");
}
