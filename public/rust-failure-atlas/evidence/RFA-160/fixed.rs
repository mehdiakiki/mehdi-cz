use std::sync::atomic::{AtomicUsize, Ordering};

fn main() {
    let state = AtomicUsize::new(7);
    assert_eq!(state.load(Ordering::Acquire), 7);
}
