use std::sync::{Arc, atomic::{AtomicU8, Ordering}};

fn main() {
    let mut slots = Vec::new();
    slots.resize_with(3, || Arc::new(AtomicU8::new(0)));
    slots[0].store(9, Ordering::Relaxed);
    assert_eq!(slots[1].load(Ordering::Relaxed), 0);
}
